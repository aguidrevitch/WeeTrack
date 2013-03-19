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
            type: String
        },
        content: {
            type: String
        },
        files: {
            type: Array
        },
        priority: {
            type: Number
        },
        owner: {
            type: String
        }
    });

    CommentSchema.plugin(require('./plugins/virtual'), {
        methods: [ 'isFirst', '_task', '_creator', '_workspace', 'transactions' ]
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
        if (this._task && this._creator && this._workspace) {
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

    CommentSchema.pre('validate', function (next) {
        if (this.isFirst) {
            if (!this.content) this.invalidate('content', 'required');
            if (!this.subject) this.invalidate('subject', 'required');
        } else {
            if (!this.content
                && (!this.files || this.files.length == 0)
                && (!this.status || this.status == this._task.status)
                && (!this.subject || this.subject == this._task.subject)
                && (!this.priority || this.priority == this._task.priority)
                && (this.owner == ((this._task.owner || {})._id || ""))
                ) {
                this.invalidate('content', 'required');
            }
        }
        next();
    });

    CommentSchema.methods.save = function (cb) {

        var self = this,
            Transaction = mongoose.model('Transaction'),
            options = {
                creator: _.pick(this._creator, '_id', 'name', 'email'),
                task: this._task._id,
                type: this.getType(this._task.path)
            },
            parallel = [],
            prevStatus, prevPriority, prevOwner, ownerUpdated;

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

        if (this.owner != (this._task.owner || {})._id) {
            ownerUpdated = true;
            prevOwner = this._task.owner;
            self._task.owner = self.owner;
        }

        async.parallel(parallel, function (err, result) {
            if (err) {
                cb(err);
            } else {
                self.transactions = _.map(result, function (t) {
                    return t[0];
                });

                delete(self.files);

                if (!self.isFirst && (prevStatus || prevPriority || ownerUpdated)) {
                    self._task.save(function (err, task) {
                        if (err) {
                            cb(err);
                        } else {
                            if (ownerUpdated) {
                                var t = new Transaction(
                                    _.extend({}, options, {
                                        type: 'reply',
                                        subtype: 'owner',
                                        previousValue: prevOwner,
                                        value: task.owner
                                    }))
                                t.save(function (err, transaction) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        self.transactions.push(transaction);
                                        cb(null, self);
                                    }
                                });
                            } else {
                                cb(null, self);
                            }
                        }
                    });
                } else {
                    cb(null, self);
                }
            }
        });

    };

    module.exports = mongoose.model('Comment', CommentSchema);

})()
