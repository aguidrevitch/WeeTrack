(function () {

    var _ = require('lodash'),
        mongoose = require('mongoose'),
        async = require('async'),
        Storage = require('./storage');

    var CommentSchema = new mongoose.Schema({
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true
        },
        type: {
            type: String,
            required: true
        },
        subject: {
            type: String
        },
        status: {
            type: String,
            default: 'new'
        },
        content: {
            type: String
        },
        files: {
            type: Array
        },
        priority: {
            type: Number
        }
    });

    CommentSchema.plugin(require('./plugins/virtual'), {
        methods: [
            'isFirst',
            '_task',
            '_creator',
            '_workspace',
            'owner',
            'admin',
            'admincc',
            'cc',
            'transactions'
        ]
    });

    CommentSchema.methods.toJSON = function (_options) {
        var ret = this.toObject(_options);
        ret.transactions = this.transactions || [];
        return ret;
    };

    CommentSchema.methods.getType = function (path) {
        if (this._task.isNew)
            return 'reply';

        var access = this._creator.getAccessTo(path);

        if (_.indexOf(access, 'admin') != -1 || _.indexOf(access, 'admincc') != -1)
            return this.type;

        return 'reply';
    };

    CommentSchema.path('type').validate(function (value, next) {
        switch (value) {
            case "comment":
            case "reply":
                next();
                break;
            default:
                next(false);
        }
    }, 'type');

    CommentSchema.pre('validate', function (next) {
        if (this.isFirst) {
            // called from Task
            next();
        } else {
            var self = this, condition = { _id: self.task };
            self.model('User').findById(self.creator, function (err, user) {
                if (err) {
                    next(err)
                } else if (!user) {
                    self.invalidate('creator', 'exists');
                    next(new Error('User not found'));
                } else {
                    self._creator = user;
                    self.model('Workspace').findById(self.workspace, function (err, workspace) {
                        if (err) {
                            next(err);
                        } else if (!workspace) {
                            self.invalidate('workspace', 'exists');
                            next(new Error('Workspace not found'));
                        } else {
                            self._workspace = workspace;
                            condition.path = new RegExp("^" + workspace._id);
                            self.model('Task').findOneWithAccess(self._creator, ['admin', 'admincc', 'cc', 'owner'], condition, function (err, task) {
                                if (err) {
                                    next(err)
                                } else if (!task) {
                                    self.invalidate('task', 'allowed');
                                    next(new Error('Task not found'));
                                } else {
                                    task.updater = self._creator;
                                    self._task = task;
                                    next();
                                }
                            });
                        }
                    })
                }
            });
        }
    });

    CommentSchema.methods.permissionsUpdated = function () {
        var updated = false;
        if ((this.owner || "") != (this._task['owner'] || ""))
            return true;

        _.each(['admin', 'admincc', 'cc'], function (perm) {
            if (this[perm] && !updated) {
                if (_.difference(this[perm], this._task[perm]).length)
                    updated = true;
                if (_.difference(this._task[perm], this[perm]).length)
                    updated = true;
            }
        }, this);
        return updated;
    };

    CommentSchema.methods.taskUpdated = function () {
        if (this.subject && this.subject != this._task.subject)
            return true;
        if (this.priority && this.priority != this._task.priority)
            return true;
        if (this.status && this.status != this._task.status)
            return true;
        return false;
    };

    CommentSchema.pre('validate', function (next) {
        if (this.isFirst) {
            if (!this.content) this.invalidate('content', 'required');
            if (!this.subject) this.invalidate('subject', 'required');
            next();
        } else {
            this._task.getAllowedSubjects(false, _.bind(function (err, allowed) {
                if (err) {
                    next(err);
                } else {
                    _.extend(this._task, allowed);
                    this._permissionsUpdated = this.permissionsUpdated();
                    this._taskUpdated = this.taskUpdated();
                    if (!this.content
                        && (!this.files || this.files.length == 0)
                        && !this._taskUpdated
                        && !this._permissionsUpdated) {
                        this.invalidate('content', 'required');
                    }
                    next();
                }
            }, this))
        }
    });

    CommentSchema.methods.postSave = function (cb) {
        var self = this,
            Transaction = mongoose.model('Transaction'),
            options = {
                creator: _.pick(this._creator, '_id', 'name', 'email'),
                task: this._task._id,
                type: 'reply'
            },
            parallel = [],
            permissions = this._task.flattenPermissions();

        _.each(this._task._grants, function (grant) {
            parallel.push(
                function (callback) {
                    var t = new Transaction(
                        _.extend({}, options, {
                            subtype: 'grant',
                            value: grant.perm,
                            meta: _.pick(grant.user, '_id', 'name', 'email')
                        })
                    );
                    t.save(callback);
                });
        });

        _.each(this._task._revokes, function (revoke) {
            parallel.push(
                function (callback) {
                    var t = new Transaction(
                        _.extend({}, options, {
                            subtype: 'revoke',
                            value: revoke.perm,
                            meta: _.pick(revoke.user, '_id', 'name', 'email')
                        })
                    );
                    t.save(callback);
                });
        });

        async.parallel(parallel, _.bind(function (err, result) {
            if (err) {
                cb(err);
            } else {
                cb(null, this);
            }
        }, this));

    };

    CommentSchema.methods.save = function (cb) {
        var self = this,
            Transaction = mongoose.model('Transaction'),
            options = {
                creator: _.pick(this._creator, '_id', 'name', 'email'),
                task: this._task._id,
                type: this.getType(this._task.path)
            },
            parallel = [];

        if (this.content) {
            parallel.push(
                function (callback) {
                    var t = new Transaction(
                        _.extend({}, options, {
                            subtype: 'text',
                            value: self.content
                        })
                    );
                    t.save(callback);
                });
        }

        if (this.files && this.files.length) {
            _.each(this.files, function (file) {
                parallel.push(
                    function (callback) {
                        Storage.save(file, function (err, uuid) {
                            if (err) {
                                callback(err)
                            } else {
                                var t = new Transaction(
                                    _.extend({}, options, {
                                        subtype: 'file',
                                        value: uuid,
                                        meta: {
                                            name: file.name,
                                            type: file.type
                                        }
                                    }));
                                t.save(callback);
                            }
                        });
                    }
                )
            })
        }

        if (!this.isFirst) {

            if (this.status && this.status != this._task.status) {
                prevStatus = this._task.status;
                self._task.status = self.status;
                parallel.push(
                    function (callback) {
                        var t = new Transaction(
                            _.extend({}, options, {
                                type: 'reply',
                                subtype: 'status',
                                previousValue: prevStatus,
                                value: self.status
                            })
                        );
                        t.save(callback);
                    });
            }

            if (this.priority && this.priority != this._task.priority) {
                prevPriority = this._task.priority;
                self._task.priority = self.priority;

                parallel.push(
                    function (callback) {
                        var t = new Transaction(
                            _.extend({}, options, {
                                type: 'reply',
                                subtype: 'priority',
                                previousValue: prevPriority,
                                value: self.priority
                            })
                        );
                        t.save(callback);
                    });
            }
        }

        async.parallel(parallel, _.bind(function (err, result) {
            if (err) {
                cb(err);
            } else {
                this.transactions = _.map(result, function (t) {
                    return t[0];
                });

                // no need to send them back
                delete(this.files);

                if (!this.isFirst && (this._taskUpdated || this._permissionsUpdated)) {
                    if (this._permissionsUpdated) {
                        if (this.admin) this._task.admin = this.admin;
                        if (this.admincc) this._task.admincc = this.admincc;
                        if (this.cc) this._task.cc = this.cc;
                        if (this.owner != null) this._task.owner = this.owner;
                    }
                    this._task.save(function (err, task) {
                        if (err) {
                            cb(err);
                        } else {
                            //self._task = task;
                            self.postSave(cb);
                        }
                    });
                } else {
                    cb(null, self);
                }
            }
        }, this));

    };

    module.exports = mongoose.model('Comment', CommentSchema);

})()
