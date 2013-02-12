(function () {

    var _ = require('lodash');
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var Transaction = require('./transaction');
    var Storage = require('./storage');
    var check = require('validator').check;
    var async = require('async');

    var TaskSchema = new mongoose.Schema({
        id: {
            type: Number,
        },
        subject: {
            type: String,
            required: true
        },
        project: {
            type: ObjectId,
            ref: 'Project',
            required: true
        },
        status: {
            type: String,
            required: true
        }
    });

    TaskSchema.plugin(require('./plugins/virtual'), {
        methods: [ 'user', 'workspace', 'content', 'files', 'transactions', 'type' ]
    });

    TaskSchema.plugin(require('./plugins/changedattributes'));

    TaskSchema.methods.toJSON = function (_options) {
        var ret = this.toObject(_options);
        ret.transactions = this.transactions || [];
        return ret;
    };

    TaskSchema.methods.getType = function () {
        if (this.isNew)
            return 'reply';

        var access = this.user.getAccessTo(this.path);

        if (_.indexOf(access, 'admin') != -1 || _.indexOf(access, 'admincc') != -1)
            return this.type;

        return 'reply';
    };

    TaskSchema.path('status').validate(function (value, next) {
        if (_.indexOf(['new', 'open', 'closed', 'resolved'], value) == -1) {
            next(false);
        } else {
            next();
        }
    }, 'exists');

    TaskSchema.pre('validate', function (next) {
        if (!this.content)
            this.invalidate('content', 'required');
        next();
    });

    TaskSchema.pre('validate', function (next) {
        var self = this;
        self.model('User').findById(this.creator, { _id: 1, name: 1, email: 1 }, function (err, user) {
            if (err) {
                next(err)
            } else if (!user) {
                self.invalidate('creator', 'exists');
                next();
            } else {
                self._creator = user;
                // must be at least client to create task and assign it to the project
                self.model('Project').findByIdWithAccess(self.user, ['admin', 'admincc', 'cc'], self.project, function (err, project) {
                    if (err) {
                        next(err)
                    } else if (!project) {
                        self.invalidate('project', 'allowed');
                        next();
                    } else {
                        self.model('Workspace').findById(project.workspace, function (err, workspace) {
                            if (err) {
                                next(err);
                            } else if (!workspace) {
                                next(new Error("Workspace not found"));
                            } else {
                                self.set('workspace', workspace);
                                next();
                            }
                        })
                    }
                });
            }
        });
    });

    TaskSchema.pre('save', function (next) {
        var self = this;
        this.workspace.getNextTicketId(function (err, workspace) {
            self.id = workspace.counter;
            next();
        });
    });

    // to register withaccess' pre-save after ours
    // but before our post-save
    TaskSchema.plugin(require('./plugins/object'), {
        subject: 'User',
        permissions: {
            'admin': true,
            'admincc': true,
            'cc': true,
            'watch': true,
            'owner': false
        },
        key: function () {
            return 'id';
        },
        pathBuilder: function (callback) {
            var self = this;
            this.model('Project').findById(this.project, function (err, project) {
                callback(err, project.workspace + '_' + self.project + '_' + self.id)
            });
        },
        extractId: function (key) {
            return key[2];
        }
    });

    // granting permissions
    TaskSchema.post('save', function (next) {
        if (this.isNew) {
            var access = this.user.getAccessTo(this.path);
            if (_.indexOf(access, 'admin') == -1 && _.indexOf(access, 'admincc') == -1) {
                Subject.grant(user_id, this.path, ['cc'], function (err) {
                    if (err) {
                        next(err);
                    } else {
                        next();
                    }
                });
            } else {
                next();
            }
        } else {
            next();
        }
    });

    TaskSchema.post('save', function (next) {
        // refreshing user;
        this.user.refresh(function (err, user) {
            if (err) {
                next(err);
            } else {
                next();
            }
        });
    });

    TaskSchema.post('save', function (next) {
        // content field was already validated
        var options = {
            creator: this._creator, // need full data about user
            task: this._id,
            type: this.getType()
        };

        var self = this;
        var parallel = [
            function (callback) {
                var t = new Transaction(
                    _.extend({}, options, {
                        subtype: 'text',
                        value: self.content
                    })
                )
                t.save(callback);
            }
        ];

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
                next(err);
            } else {
                next();
            }
        });
    });

    TaskSchema.methods.transactions = function (callback) {
        var options = {
            task: this._id,
        };

        var access = this.user.getAccessTo(this.path);
        if (_.indexOf(access, 'admin') != -1 || _.indexOf(access, 'admincc') != -1) {
            options.type = { $in: ['reply', 'comment'] };
        } else {
            options.type = 'reply';
        }

        this.model('Transaction').find(options, callback);
    };

    module.exports = mongoose.model('Task', TaskSchema);

})();