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
        content: {
            type: String
        },
        files: {
            type: Array
        }
    });

    CommentSchema.plugin(require('./plugins/virtual'), {
        methods: [ '_task', '_creator', '_workspace', 'transactions' ]
    });

    CommentSchema.methods.toJSON = function (_options) {
        var ret = this.toObject(_options);
        ret.transactions = this.transactions || [];
        return ret;
    };

    CommentSchema.methods.getType = function (path) {
        if (this.isNew)
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
        if (!this.content && (!this.files || this.files.length == 0)) {
            this.invalidate('content', 'required');
        }
        next();
    });

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
                    next();
                } else {
                    self._creator = user;
                    self.model('Workspace').findById(self.workspace, function (err, workspace) {
                        if (err) {
                            next(err);
                        } else if (!workspace) {
                            self.invalidate('workspace', 'exists');
                            next();
                        } else {
                            self._workspace = workspace;
                            condition.path = new RegExp("^" + workspace._id);
                            self.model('Task').findOneWithAccess(self._creator, ['admin', 'admincc', 'cc', 'owner'], condition, function (err, task) {
                                if (err) {
                                    next(err)
                                } else if (!task) {
                                    self.invalidate('task', 'allowed');
                                    next();
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

    CommentSchema.methods.save = function (cb) {

        var Transaction = mongoose.model('Transaction');

        var options = {
            creator: _.pick(this._creator, '_id', 'name', 'email'),
            task: this._task._id,
            type: this.getType(this._task.path)
        };

        var self = this;

        var parallel = []
        if (this.content)
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

        if (this.files) {
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

        async.parallel(parallel, function (err, result) {
            if (err) {
                cb(err);
            } else {

                self.transactions = _.map(result, function (t) {
                    return t[0];
                });
                delete(self.files);
                cb(null, self);
            }
        });

    };

    module.exports = mongoose.model('Comment', CommentSchema);

})()
