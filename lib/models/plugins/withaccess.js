var _ = require('lodash');
var async = require('async');
var check = require('validator').check;
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const VISIBLE = 'visible';

module.exports = function (schema, options) {

    options || (options = {});

    if (!options.pathBuilder)
        throw new Error('No path builder specified');

    if (!options.subject)
        throw new Error('No subject specified');

    schema.add({
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: options.subject,
            required: true
        },
        path: {
            type: String,
            require: false
        }
    });

    schema.virtual('administrators').set(function (value) {
        this._administrators = value;
    });

    schema.virtual('administrators').get(function () {
        return this._administrators;
    });

    schema.virtual('users').set(function (value) {
        this._users = value;
    });

    schema.virtual('users').get(function () {
        return this._users;
    });

    schema.virtual('clients').set(function (value) {
        this._clients = value;
    });

    schema.virtual('clients').get(function () {
        return this._clients;
    });

    schema.virtual('watchers').set(function (value) {
        this._watchers = value;
    });

    schema.virtual('watchers').get(function () {
        return this._watchers;
    });

    schema.virtual('owner').set(function (value) {
        this._owner = value;
    });

    schema.virtual('owner').get(function () {
        return this._owner;
    });

    schema.methods.toJSON = function () {
        obj = this.toObject();
        obj.administrators = this.administrators;
        obj.users = this.users;
        obj.clients = this.clients;
        obj.watchers = this.watchers;
        obj.owner = this.owner;
        return obj;
    }

    schema.methods.getAllowedSubjects = function (complete, callback) {
        var Subject = this.model(options.subject);
        var result = {
            administrators: [],
            users: [],
            clients: [],
            watchers: [],
            owner: null
        };

        var path = this.path;
        var or = [];
        _.each(['admin', 'admincc', 'cc', 'watch', 'owner'], function (perm) {
            var query = {}
            query['acl.' + perm + '.' + path] = true;
            or.push(query);
        })
        Subject.find(
            { $or: or },
            {_id: 1, name: 1, email: 1, acl: 1 },
            function (err, subjects) {
                if (err) {
                    callback(err)
                } else {
                    _.each(subjects, function (subject) {
                        _.each({
                            'admin': 'administrators',
                            'admincc': 'users',
                            'cc': 'clients',
                            'watch': 'watchers',
                            'owner': 'owner'
                        }, function (key, perm) {
                            if (subject.acl && subject.acl[perm] && subject.acl[perm][path]) {
                                if (complete) {
                                    if (key == 'owner') {
                                        result[key] = subject;
                                    } else {
                                        result[key].push(subject);
                                    }
                                } else {
                                    // must be converted to string
                                    if (key == 'owner') {
                                        result[key] = subject._id.toString();
                                    } else {
                                        result[key].push(subject._id.toString());
                                    }
                                }
                            }
                        });
                        subject.acl = undefined;
                    });
                    callback(null, result);
                }
            }
        );
    };

    schema.methods.checkUsersExist = function (list, field, callback) {

        var self = this;

        if (!list || !_.isArray(list))
            throw new Error('user list should be array');

        var ids = [];
        var ids_plain = [];
        _.each(list, function (id) {
            if (id) {
                try {
                    ids.push(ObjectId.fromString(id));
                    ids_plain.push(id.toString());
                } catch (e) {
                    try {
                        check(id).isEmail();
                    } catch (e) {
                        self.invalidate(field, 'user exists');
                        callback(e);
                    }
                }
            }
        });

        if (ids) {
            // console.log(field, ids);
            this.model(options.subject).find({ _id: { $in: ids } }, function (err, result) {
                if (err) {
                    callback(err)
                } else {
                    var found = _.map(result, function (user) {
                        return user._id.toString();
                    });
                    //console.log(ids_plain, found, _.difference(ids_plain, found));
                    if (_.difference(ids_plain, found).length) {
                        self.invalidate(field, 'user exists');
                        callback(new Error('Some users not exist'));
                    } else {
                        callback(null, result); // no need to return users
                    }
                }
            });
        } else {
            callback();
        }
    };

    /* middlewares */

    schema.pre('validate', function (next) {

        this.set('administrators', this.administrators || []);
        this.set('users', this.users || []);
        this.set('clients', this.clients || []);
        this.set('watchers', this.watchers || []);

        async.parallel([
            _.bind(this.checkUsersExist, this, this.administrators, 'administrators'),
            _.bind(this.checkUsersExist, this, this.users, 'users'),
            _.bind(this.checkUsersExist, this, this.clients, 'clients'),
            _.bind(this.checkUsersExist, this, this.watchers, 'watchers'),
            _.bind(this.checkUsersExist, this, [this.owner], 'owner')
        ], function (err, results) {
            if (err) {
                next(err[0]);
            } else {
                next();
            }
        })
    });

    schema.pre('save', function (next) {

        var self = this;
        options.pathBuilder.call(this, _.bind(function (err, path) {
            if (err) {
                next(err);
            } else if (!path) {
                next(new Error('Empty path'));
            } else {
                this.path = path;
                this.getAllowedSubjects(false, _.bind(function (err, result) {
                    if (err) {
                        next(err);
                        return;
                    }

                    var Subject = self.model(options.subject);

                    var grants = [], revokes = [];

                    // must be converted to string
                    this.administrators.push(this.creator.toString());
                    //this.administrators = _.uniq(this.administrators);
                    var grant = _.bind(function (perm, user_id) {
                        if (user_id)
                            grants.push(_.bind(function (callback) {
                                // console.log("granting " + perm + " to " + user_id);
                                Subject.grant(user_id, this.path, [perm], callback);
                            }, this));
                    }, this);

                    var revoke = _.bind(function (perm, user_id) {
                        if (user_id)
                            revokes.push(_.bind(function (callback) {
                                // console.log("revoking " + perm + " from " + user_id);
                                Subject.revoke(user_id, this.path, [perm], callback);
                            }, this));
                    }, this);

                    _.each(_.difference(this.administrators, result.administrators), _.bind(grant, this, ['admin']));
                    _.each(_.difference(this.users, result.users), _.bind(grant, this, ['admincc']));
                    _.each(_.difference(this.clients, result.clients), _.bind(grant, this, ['cc']));
                    _.each(_.difference(this.watchers, result.watchers), _.bind(grant, this, ['watch']));

                    _.each(_.difference(result.administrators, this.administrators), _.bind(revoke, this, ['admin']));
                    _.each(_.difference(result.users, this.users), _.bind(revoke, this, ['admincc']));
                    _.each(_.difference(result.clients, this.clients), _.bind(revoke, this, ['cc']));
                    _.each(_.difference(result.watchers, this.watchers), _.bind(revoke, this, ['watch']));

                    if (this.owner != result.owner) {
                        revoke.call(this, 'owner', result.owner);
                        grant.call(this, 'owner', this.owner);
                    }

                    /* granting permissions in parallel */
                    async.parallel(grants, _.bind(function (err) {
                        if (err)
                            next(err);
                        else
                        /* revoking permissions in parallel */
                            async.parallel(revokes, _.bind(function (err) {
                                if (err)
                                    next(err);
                                else
                                    this.getAllowedSubjects(true, _.bind(function (err, allowed) {
                                        this.administrators = allowed.administrators;
                                        this.users = allowed.users;
                                        this.clients = allowed.clients;
                                        this.watchers = allowed.watchers;
                                        this.owner = allowed.owner;
                                        next(err);
                                    }, this))
                            }, this));
                    }, this));
                }, this));
            }
        }, this));
    });

    schema.methods.watch = function (user, callback) {
        this.model(options.subject).grant(user._id, this.path, ['watch'], _.bind(function (err, count) {
            if (count) {
                this.getAllowedSubjects(true, _.bind(function (err, allowed) {
                    this.administrators = allowed.administrators;
                    this.users = allowed.users;
                    this.clients = allowed.clients;
                    this.watchers = allowed.watchers;
                    callback(err, this);
                }, this))
            } else {
                callback('Not found');
            }
        }, this));
    };

    schema.methods.unwatch = function (user, callback) {
        this.model(options.subject).revoke(user._id, this.path, ['watch'], _.bind(function (err, count) {
            if (count) {
                this.getAllowedSubjects(true, _.bind(function (err, allowed) {
                    this.administrators = allowed.administrators;
                    this.users = allowed.users;
                    this.clients = allowed.clients;
                    this.watchers = allowed.watchers;
                    callback(err, this);
                }, this))
            } else {
                callback('Not found');
            }
        }, this));
    };

    schema.statics.buildCriteria = function (user, perms, conditions) {
        if (!perms)
            throw new Error('No permissions passed');

        if (!_.isArray(perms))
            throw new Error('Permissions should be an array');

        if (_.indexOf(perms, VISIBLE) >= 0) {

            if (perms.length > 1)
                throw new Error('Visible permission can\'t be coupled with other permissions');

            var list = [];
            _.each(user.acl, function (values) {
                //console.log(values);
                _.each(values, function (value, key) {
                    //console.log(key);
                    var id = options.extractId.call(this, key.split('_'));
                    if (id)
                        list.push(id);
                }, this);
            });

            if (list.length) {
                var subcondition = {};
                subcondition[options.key()] = {$in: list};
                return { $and: [ conditions, subcondition ] };
            } else {
                return conditions;
            }

        } else {
            var keys = user.keysWithAccess(perms);
            if (keys.length) {
                var or = keys.map(function (key) {
                    return { path: new RegExp("^" + key) };
                });
                return { $and: [ conditions, { $or: or } ] };
            } else {
                return conditions;
            }
        }
    }

    schema.statics.findWithAccess = function (user, perms, conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        var criteria = this.buildCriteria(user, perms, conditions);
        if (!criteria) {
            callback(null, []);
            return;
        }

        this.find.apply(this, [criteria, fields, options, _.bind(function (err, records) {
            if (err) {
                callback(err)
            } else if (records && records.length) {
                var collectors = [];
                var result = [];
                _.each(records, function (record, key) {
                    collectors.push(_.bind(function (callback) {
                        record.getAllowedSubjects(true, function (err, allowed) {
                            if (err) {
                                callback(err)
                            } else {
                                record.administrators = allowed.administrators;
                                record.users = allowed.users;
                                record.clients = allowed.clients;
                                record.watchers = allowed.watchers;
                                record.owner = allowed.owner;
                                callback(null, record);
                            }
                        });
                    }, this));
                }, this);
                async.parallel(collectors, callback);
            } else {
                callback(null, []);
            }
        }, this)]);
    };

    schema.statics.findOneWithAccess = function (user, perms, conditions, fields, options, callback) {
        if ('function' == typeof conditions) {
            callback = conditions;
            conditions = {};
            fields = null;
            options = null;
        } else if ('function' == typeof fields) {
            callback = fields;
            fields = null;
            options = null;
        } else if ('function' == typeof options) {
            callback = options;
            options = null;
        }

        var criteria = this.buildCriteria(user, perms, conditions);
        if (!criteria) {
            callback();
            return;
        }

        this.findOne.apply(this, [criteria, fields, options, function (err, record) {
            if (err) {
                callback(err)
            } else if (record) {
                record.getAllowedSubjects(true, function (err, allowed) {
                    if (err) {
                        callback(err)
                    } else {
                        record.administrators = allowed.administrators;
                        record.users = allowed.users;
                        record.clients = allowed.clients;
                        record.watchers = allowed.watchers;
                        record.owner = allowed.owner;
                        callback(null, record);
                    }
                });
            } else {
                callback();
            }
        }])
    };

    schema.statics.findByIdWithAccess = function (user, perms, id, fields, options, callback) {
        return this.findOneWithAccess(user, perms, { _id: id }, fields, options, callback);
    };

};
