var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

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
            required: true
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

    /* middlewares */
    schema.pre('validate', function (next) {
        this.path = options.pathBuilder.call(this);
        next();
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

        var id = this._id;
        var or = [];
        _.each(['admin', 'admincc', 'cc', 'watch'], function (perm) {
            var query = {}
            query['acl.' + perm + '.' + id] = true;
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
                            if (subject.acl && subject.acl[perm] && subject.acl[perm][id])
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

    schema.pre('save', function (next) {
        this.getAllowedSubjects(false, _.bind(function (err, result) {
            if (err) {
                next(err);
                return;
            }

            var Subject = this.model(options.subject);

            var grants = [], revokes = [];

            // must be converted to string
            this.administrators.push(this.creator.toString());
            //this.administrators = _.uniq(this.administrators);

            _.each(this.administrators, function (user_id) {
                if (user_id)
                    grants.push(_.bind(function (callback) {
                        console.log("granting admin " + user_id);
                        Subject.grant(user_id, this._id, ['admin'], callback);
                    }, this));
            }, this);
            _.each(this.users, function (user_id) {
                if (user_id)
                    grants.push(_.bind(function (callback) {
                        console.log("granting admincc " + user_id);
                        Subject.grant(user_id, this._id, ['admincc'], callback);
                    }, this));
            }, this);

            _.each(this.clients, function (user_id) {
                if (user_id)
                    grants.push(_.bind(function (callback) {
                        console.log("granting cc " + user_id);
                        Subject.grant(user_id, this._id, ['cc'], callback);
                    }, this));
            }, this);

            _.each(_.difference(result.administrators, this.administrators), function (user_id) {
                if (user_id)
                    revokes.push(_.bind(function (callback) {
                        console.log("revoking admin " + user_id);
                        Subject.revoke(user_id, this._id, ['admin'], callback);
                    }, this));
            }, this)

            console.log(this.users, result.users, _.difference(result.users, this.users));
            _.each(_.difference(result.users, this.users), function (user_id) {
                if (user_id)
                    revokes.push(_.bind(function (callback) {
                        console.log("revoking admincc " + user_id);
                        Subject.revoke(user_id, this._id, ['admincc'], callback);
                    }, this));
            }, this)

            _.each(_.difference(this.clients, result.clients), function (user_id) {
                if (user_id)
                    revokes.push(_.bind(function (callback) {
                        console.log("revoking cc " + user_id);
                        Subject.revoke(user_id, this._id, ['cc'], callback);
                    }, this));
            }, this)

            /* granting permissions in parallel */
            async.parallel(grants, _.bind(function (err) {
                if (err)
                    next(err);
                else
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
