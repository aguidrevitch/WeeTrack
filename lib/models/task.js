(function () {

    var _ = require('lodash');
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var Transaction = require('./transaction');
    var check = require('validator').check;

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
        },
        //transactions: [ Transaction.schema ],
    });

    TaskSchema.plugin(require('./plugins/changedattributes'));

    TaskSchema.path('status').validate(function (value, next) {
        if (_.indexOf(['new', 'open', 'closed', 'resolved'], value) == -1) {
            next(false);
        } else {
            next();
        }
    }, 'exists');

    TaskSchema.path('project').validate(function (value, next) {
        var self = this;
        next();
        return;
        if (this.isNew) {
            self.model('User').findById(this.creator, function (err, user) {
                if (!user) {
                    next(false);
                } else {
                    // must be at least client to create task and assign it to the project
                    self.model('Project').findByIdWithAccess(user, ['admin','admincc', 'cc'], value, function (err, project) {
                        if (!project) {
                            next(false);
                        } else {
                            next();
                        }
                    });
                }
            })
        } else {
            // project cannot be changed
            next(false);
        }
    }, 'project allowed');

    /*
    TaskSchema.path('owner').validate(function (value, next) {
        if (value) {
            this.model('User').findByIdOrEmail(value, function (err, user) {
                if (user) {
                    next();
                } else {
                    // else just valid email is required
                    try {
                        check(value).isEmail();
                        next();
                    } catch (e) {
                        next(false);
                    }
                }
            });
        } else {
            // empty value allowed
            next();
        }
    }, 'exists');
    */

    TaskSchema.pre('save', function (next) {
        var self = this;
        this.model('Project').findById(this.project, function (err, project) {
            if (!project) {
                next(err || new Error('Project not found'));
            } else {
                self.model('Workspace').findById(project.workspace, function (err, workspace) {
                    if (!workspace) {
                        next(err || new Error('Workspace not found'));
                    } else {
                        workspace.getNextTicketId(function (err, workspace) {
                            self.id = workspace.counter;
                            next();
                        });
                    }
                });
            }
        });
    });

    // to register withaccess' pre-save after ours
    TaskSchema.plugin(require('./plugins/withaccess'), {
        subject: 'User',
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

    module.exports = mongoose.model('Task', TaskSchema);

})();