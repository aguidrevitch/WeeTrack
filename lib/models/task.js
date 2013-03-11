(function () {

    var mongoose = require('mongoose')
        , ObjectId = mongoose.Schema.Types.ObjectId
        , _ = require('lodash');

    var TaskSchema = new mongoose.Schema({
        id: {
            type: Number
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
        },
        priority: {
            type: Number,
            default: 40
        }
    });

    TaskSchema.plugin(require('./plugins/virtual'), {
        methods: [ 'content', 'files', 'transactions', 'type' ]
    });

    TaskSchema.plugin(require('./plugins/changedattributes'));

    TaskSchema.methods.toJSON = function (_options) {
        var ret = this.toObject(_options);
        ret.transactions = this.transactions || [];
        return ret;
    };

    TaskSchema.path('status').validate(function (value, next) {
        if (_.indexOf(['new', 'open', 'closed', 'resolved'], value) == -1) {
            next(false);
        } else {
            next();
        }
    }, 'exists');

    TaskSchema.pre('validate', function (next) {
        var self = this;
        if (this.isNew) {
            // must be at least client to create task and assign it to the project
            this.model('Project').findByIdWithAccess(self.updater, ['admin', 'admincc', 'cc', 'owner'], this.project, function (err, project) {
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
                            self._workspace = workspace;
                            next();
                        }
                    })
                }
            });
        } else {
            next();
        }
    });

    TaskSchema.pre('validate', function (next) {
        if (this.isNew) {
            var Comment = mongoose.model('Comment');

            this._comment = new Comment({
                creator: this.updater,
                task: this._id,
                workspace: this._workspace,
                type: this.type,
                status: this.status,
                content: this.content,
                files: this.files,

                _creator: this.updater,
                _task: this,
                _workspace: this._workspace
            });

            var self = this;
            this._comment.validate(function (err) {
                if (err) {
                    _.each(err.errors, function (val, field) {
                        self.invalidate(field, val.type);
                    });
                    next();
                } else {
                    next();
                }
            })
        } else {
            next();
        }
    });

    TaskSchema.pre('save', function (next) {
        var self = this;
        if (this.isNew) {
            this._workspace.getNextTicketId(function (err, workspace) {
                self.id = workspace.counter;
                next();
            });
        } else {
            next();
        }
    });

    // to register withaccess' pre-save after ours
    // but before our post-save
    TaskSchema.plugin(require('./plugins/object'), {
        subject: 'User',
        permissions: {
            'admin': true,
            'admincc': true,
            'cc': true,
            'owner': false
        },
        getMaxPermission: function (list) {
            if (_.indexOf(list, 'admin') != -1)
                return 'admin';
            if (_.indexOf(list, 'admincc') != -1)
                return 'admincc';
            if (_.indexOf(list, 'cc') != -1)
                return 'cc';
            if (_.indexOf(list, 'owner') != -1)
                return 'owner';
        },
        canUpdate: function (role, prop) {
            if (role == 'admin')
                return _.indexOf(['id', 'project', 'path', 'creator'], prop) == -1;
            if (role == 'admincc')
                return _.indexOf(['subject', 'status', 'priority', 'admincc', 'cc', 'owner'], prop) != -1;
            if (role == 'cc' || role == 'owner')
                return _.indexOf(['subject', 'status', 'priority', 'cc', 'owner'], prop) != -1;
            return false;
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
            var access = this.updater.getAccessTo(this.path);
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
        this.updater.refresh(function (err, user) {
            if (err) {
                next(err);
            } else {
                next();
            }
        });
    });

    TaskSchema.post('save', function (next) {
        if (this._comment) {
            this._comment.save(function (err, comment) {
                if (err) {
                    next(err)
                } else {
                    next();
                }
            });
        } else {
            next();
        }
    });

    TaskSchema.methods.transactions = function (callback) {
        var options = {
            task: this._id
        };

        var access = this.updater.getAccessTo(this.path);
        if (_.indexOf(access, 'admin') != -1 || _.indexOf(access, 'admincc') != -1) {
            options.type = { $in: ['reply', 'comment'] };
        } else {
            options.type = 'reply';
        }

        this.model('Transaction').find(options, callback);
    };

    TaskSchema.methods.setSafe = function (attributes) {
        _.each(['admin', 'admincc', 'cc', 'owner', 'subject', 'status', 'priority'], function (prop) {
            if (attributes[prop])
                this[prop] = attributes[prop];
        }, this);
    };

    module.exports = mongoose.model('Task', TaskSchema);

})();