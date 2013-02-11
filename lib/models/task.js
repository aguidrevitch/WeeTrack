(function () {

    var _ = require('lodash');
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var Transaction = require('./transaction');
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
        methods: [ 'user', 'workspace', 'filemanager', 'content', 'upload', 'transactions', 'type' ]
    });

    TaskSchema.methods.toJSON = function (_options) {
        var ret = this.toObject(_options);
        ret.transactions = this.transactions || [];
        return ret;
    };

    TaskSchema.methods.getType = function () {
        var access = this.user.getAccessTo(this.path);
        var type = 'cc';
        if (_.indexOf(access, 'admin') != -1 || _.indexOf(access, 'admincc') != -1)
            type = 'reply';
        return type;
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
        self.model('User').findById(this.creator, function (err, user) {
            if (err) {
                next(err)
            } else if (!user) {
                self.invalidate('creator', 'exists');
                next();
            } else {
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
        var transactions = [];

        var options = {
            creator: this.creator,
            task: this._id,
            type: this.getType()
        };

        if (this.content) {
            transactions.push(new Transaction(
                _.extend({}, options, {
                    subtype: 'text',
                    content: this.content
                }))
            );
        }

        if (this.subject != this.old('subject')) {
            transactions.push(new Transaction(
                _.extend({}, options, {
                    subtype: 'subject',
                    before: this.old('subject'),
                    after: this.subject,
                }))
            );
        }

        if (this.owner != this.old('owner')) {
            console.log('owner changed', this.owner, this.old('owner'));
        }

        async.parallel(
            _.map(transactions, function (transaction) {
                return function (callback) {
                    transaction.save(callback);
                };
            }), function (err, result) {
                next();
            });
    });

    TaskSchema.methods.transactions = function (callback) {
        var options = {
            task: this._id,
        };

        if (this.getType() == 'comment')
            options.type = 'comment';

        this.model('Transaction').find(options, callback);
    };

    TaskSchema.plugin(require('./plugins/changedattributes'));

    module.exports = mongoose.model('Task', TaskSchema);

})();