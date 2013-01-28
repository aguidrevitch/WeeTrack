var _ = require('lodash');
var async = require('async');

module.exports = function (schema, options) {

    options || (options = {});

    if (!options.pathBuilder)
        throw new Error('No path builder specified');

    if (!options.subject)
        throw new Error('No subject specified');

    schema.add({
        creator: {
            type: require('mongoose').Schema.Types.ObjectId,
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

    schema.methods.toJSON = function () {
        obj = this.toObject();
        obj.administrators = this.administrators;
        obj.users = this.users;
        obj.clients = this.clients;
        return obj
    }

    schema.methods.getAllowedSubjects = function (complete, callback) {
        var Subject = this.model(options.subject);
        var result = {
            administrators: [],
            users: [],
            clients: []
        };

        var path = this.path;
        var or = [];
        _.each(['admin', 'admincc', 'cc', 'watch'], function (perm) {
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
                        _.each({'admin': 'administrators', 'admincc': 'users', 'cc': 'clients'}, function (key, perm) {
                            if (subject.acl && subject.acl[perm] && subject.acl[perm][path])
                                if (complete) {
                                    delete(subject.acl[perm]);
                                    result[key].push(subject);
                                } else {
                                    // must be converted to string
                                    result[key].push(subject._id.toString());
                                }
                        });
                    });
                    callback(null, result);
                }
            }
        );
    };

    /* middlewares */

    schema.pre('save', function (next) {

        this.set('administrators', this.administrators || []);
        this.set('users', this.users || []);
        this.set('clients', this.clients || []);

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

                    _.each(this.administrators, _.bind(grant, this, ['admin']));
                    _.each(this.users, _.bind(grant, this, ['admincc']));
                    _.each(this.clients, _.bind(grant, this, ['cc']));

                    _.each(_.difference(result.administrators, this.administrators), _.bind(revoke, this, ['admin']));
                    _.each(_.difference(result.users, this.users), _.bind(revoke, this, ['admincc']));
                    _.each(_.difference(result.clients, this.clients), _.bind(revoke, this, ['cc']));

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
                                        next(err);
                                    }, this))
                            }, this));
                    }, this));
                }, this));
            }
        }, this));
    });

    schema.statics.buildCriteria = function (user, perm, conditions) {
        if (!perm)
            throw new Error('No permissions passed');

        var perms;
        switch (perm) {
            case 'watch':
                perms = ['watch'];
                break;
            case 'cc':
                perms = ['admin', 'admincc', 'cc'];
                break;
            case 'admincc':
                perms = ['admin', 'admincc'];
                break;
            case 'admin':
                perms = ['admin'];
                break;
            default:
                throw new Error('Wrong permission: ' + perm);
        }

        var keys = user.keysWithAccess(perms);
        if (keys.length) {
            var or = keys.map(function (key) {
                return { path: new RegExp("^" + key) };
            });
            return { $and: [ conditions, { $or: or } ] };
        } else {
            return null;
        }
    }

    schema.statics.findWithAccess = function (user, perm, conditions, fields, options, callback) {
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

        var criteria = this.buildCriteria(user, perm, conditions);
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

    schema.statics.findOneWithAccess = function (user, perm, conditions, fields, options, callback) {
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

        var criteria = this.buildCriteria(user, perm, conditions);
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
                        callback(null, record);
                    }
                });
            } else {
                callback();
            }
        }])
    };

    schema.statics.findByIdWithAccess = function (user, perm, id, fields, options, callback) {
        return this.findOneWithAccess(user, perm, { _id: id }, fields, options, callback);
    };

};
