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

    if (!options.permissions)
        throw new Error('No permission list');

    schema.add({
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: options.subject,
            required: true
        },
        path: {
            type: String
        }
    });

    schema.virtual('updater').set(function (value) {
        this._updater = value;
    });

    schema.virtual('updater').get(function () {
        return this._updater;
    });

    _.each(options.permissions, function (multiple, perm) {
        schema.virtual(perm).set(function (value) {
            this["_" + perm] = value;
            return value;
        });
        schema.virtual(perm).get(function (value) {
            return this["_" + perm];
        });
    });

    var _toJSON = schema.methods.toJSON;
    schema.methods.toJSON = function (_options) {
        var ret;

        if (_toJSON) {
            ret = _toJSON.call(this, _options);
        } else {
            ret = this.toObject(_options);
        }

        _.each(options.permissions, function (multiple, perm) {
            ret[perm] = this[perm];
        }, this);

        ret.permissions = this.permissions;

        return ret;
    };

    schema.methods.getAllowedSubjects = function (complete, callback) {
        var Subject = this.model(options.subject), result = {};

        _.each(options.permissions, function (multiple, perm) {
            result[perm] = multiple ? [] : null;
        });

        Subject.find(
            { 'acl.path': this.path },
            {_id: 1, name: 1, email: 1, acl: 1 },
            _.bind(function (err, subjects) {
                if (err) {
                    callback(err)
                } else {
                    _.each(subjects, function (subject) {
                        _.each(subject.acl, function (record) {
                            if (record.path == this.path) {
                                if (options.permissions[record.perm] === true) {
                                    result[record.perm].push(complete ? subject : subject._id.toString());
                                } else if (options.permissions[record.perm] === false) {
                                    result[record.perm] = complete ? subject : subject._id.toString();
                                }
                            }
                        }, this);
                        subject.acl = undefined;
                    }, this);
                    callback(null, result);
                }
            }, this)
        );
    };

    schema.methods.checkSubjectExist = function (list, field, callback) {

        var self = this;

        if (!list || !_.isArray(list)) {
            self.invalidate(field, 'list');
            callback(new Error('not a list'));
            return;
        }

        var ids = [];
        var ids_plain = [];
        _.each(list, function (id) {
            if (id) {
                if ('object' == typeof id) id = id._id;
                try {
                    ids.push(ObjectId.fromString(id.toString()));
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
            this.model(options.subject).find({ _id: { $in: ids } }, function (err, result) {
                if (err) {
                    callback(err)
                } else {
                    var found = _.map(result, function (user) {
                        return user._id.toString();
                    });
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

    schema.methods.flatten = function () {
        var perms = {};
        _.each(options.permissions, function (multiple, perm) {
            if (multiple) {
                perms[perm] = [];
                _.each(this[perm], function (id) {
                    perms[perm].push(('object' == typeof id) ? id._id.toString() : id);
                });
            } else {
                perms[perm] = this[perm] && 'object' == typeof this[perm]
                    ? this[perm]._id.toString()
                    : this[perm];
            }
        }, this);
        _.extend(this, perms);
    };

    /* middlewares */
    schema.post('init', function (next) {
        this.getAllowedSubjects(true, _.bind(function (err, allowed) {
            if (err) {
                next(err);
            } else {
                _.extend(this, allowed);
                next();
            }
        }, this));
    });

    schema.pre('validate', function (next) {
        var access, maxperm;

        if (!this.isNew) {
            access = this.updater.getAccessTo(this.path);
            maxperm = options.getMaxPermission(access);
        }

        async.parallel(
            _.map(options.permissions, function (multiple, perm) {
                if (this.isNew || options.canGrant(maxperm, perm)) {
                    if (multiple) {
                        return _.bind(this.checkSubjectExist, this, this[perm], perm);
                    } else {
                        return _.bind(this.checkSubjectExist, this, [this[perm]], perm);
                    }
                } else {
                    return function (callback) {
                        callback();
                    };
                }
            }, this),
            function (err, results) {
                if (err) {
                    next(err[0]);
                } else {
                    next();
                }
            }
        );
    });

    schema.methods.grant = function (callback) {

        this.getAllowedSubjects(false, _.bind(function (err, allowed) {

            if (err) {
                callback(err);
                return;
            }

            var access = this.updater.getAccessTo(this.path);
            var maxperm = options.getMaxPermission(access);

            this.flatten();

            var Subject = this.model(options.subject);

            var grants = [], revokes = [];

            var grant = _.bind(function (perm, user_id) {
                if (user_id && (this.isNew || options.canGrant(maxperm, perm)))
                    grants.push(_.bind(function (callback) {
                        // console.log("granting " + perm + " to " + user_id);
                        Subject.grant(user_id, this.path, [perm], callback);
                    }, this));
            }, this);

            var revoke = _.bind(function (perm, user_id) {
                if (user_id && options.canGrant(maxperm, perm) && this.updater._id != user_id)
                    revokes.push(_.bind(function (callback) {
                        // console.log("revoking " + perm + " from " + user_id);
                        Subject.revoke(user_id, this.path, [perm], callback);
                    }, this));
            }, this);

            _.each(options.permissions, function (multiple, perm) {
                if (multiple) {
                    _.each(_.difference(this[perm], allowed[perm]), _.bind(grant, this, perm));
                }
            }, this);

            _.each(options.permissions, function (multiple, perm) {
                if (multiple)
                    _.each(_.difference(allowed[perm], this[perm]), _.bind(revoke, this, perm));
            }, this);

            _.each(options.permissions, function (multiple, perm) {
                if (!multiple && this[perm] !== allowed[perm]) {
                    if (allowed[perm]) revoke(perm, allowed[perm]);
                    if (this[perm]) grant(perm, this[perm]);
                }
            }, this);

            /* granting permissions in parallel */
            async.parallel(revokes, _.bind(function (err) {
                if (err)
                    callback(err);
                else
                /* revoking permissions in parallel */
                    async.parallel(grants, _.bind(function (err) {
                        if (err)
                            callback(err);
                        else
                            this.getAllowedSubjects(true, _.bind(function (err, allowed) {
                                _.extend(this, allowed);
                                callback(err);
                            }, this))
                    }, this));
            }, this));

        }, this));
    };

    schema.pre('save', function (next) {
        if (this.isNew) {
            // create path first
            options.pathBuilder.call(this, _.bind(function (err, path) {
                if (err) {
                    next(err);
                } else if (!path) {
                    next(new Error('Empty path'));
                } else {
                    this.path = path;

                    // must be converted to string
                    if (options.creatorPermission) {
                        this[options.creatorPermission].push(this.creator.toString());
                    }

                    this.grant(function (err) {
                        if (err) {
                            next(err);
                        } else {
                            next();
                        }
                    });
                }
            }, this));

        } else {
            this.grant(function (err) {
                if (err) {
                    next(err);
                } else {
                    next();
                }
            });
        }
    });

    schema.post('save', function (next) {
        this.updater.refresh(_.bind(function (err, user) {
            if (err) {
                next(err);
            } else {
                this.permissions = user.getAccessTo(this.path);
                next();
            }
        }, this));
    });

    schema.statics.buildCriteria = function (user, perms, conditions) {
        if (!perms)
            throw new Error('No permissions passed');

        if (!_.isArray(perms))
            throw new Error('Permissions should be an array');

        if (_.indexOf(perms, VISIBLE) >= 0) {

            if (perms.length > 1)
                throw new Error('Visible permission can\'t be coupled with other permissions');

            var list = [];
            _.each(user.acl, function (record) {
                var id = options.extractId.call(this, record.path.split('_'));
                if (id)
                    list.push(id);
            }, this);

            if (list.length) {
                var subcondition = {};
                subcondition[options.key()] = {$in: list};
                return { $and: [ conditions, subcondition ] };
            } else {
                return null;
            }

        } else {
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
    };

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

        this.find.apply(this, [criteria, fields, options, function (err, result) {
            if (err) {
                callback(err)
            } else {
                _.each(result, function (rec) {
                    rec.permissions = user.getAccessTo(rec.path);
                });
                callback(null, result);
            }
        }]);
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

        this.findOne.apply(this, [criteria, fields, options, function (err, rec) {
            if (err) {
                callback(err)
            } else {
                if (rec)
                    rec.permissions = user.getAccessTo(rec.path);
                callback(null, rec);
            }
        }]);
    };

    schema.statics.findByIdWithAccess = function (user, perms, id, fields, options, callback) {
        return this.findOneWithAccess(user, perms, { _id: id }, fields, options, callback);
    };

}
;
