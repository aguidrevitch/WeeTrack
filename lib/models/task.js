(function () {

    var _ = require('lodash');
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var Transaction = require('./transaction');

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
        owner: {
            type: mongoose.Schema.Types.Mixed,
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
    }, 'status');

    TaskSchema.path('project').validate(function (value, next) {
        // changing task's workspace is not allowed yet
        if (!this.isNew && value.toString() != this.old('project').toString()) {
            next(false);
        } else {
            next();
        }
    }, 'task update');

    TaskSchema.path('project').validate(function (value, next) {
        var self = this;
        if (this.isNew) {
            this.model('User').findById(this.creator, function (err, user) {
                if (!user) {
                    next(false)
                } else {
                    // must be admin in selected workspace
                    self.model('Project').findByIdWithAccess(user, 'cc', value, function (err, project) {
                        if (!project) {
                            next(false);
                        } else {
                            next();
                        }
                    });
                }
            })
        } else {
            next();
        }
    }, 'project allowed');

    TaskSchema.path('owner').validate(function (value, next) {
        //this.model('User').findOrCreate()
    });

    TaskSchema.pre('save', function (next) {
        var self = this;
        if (this.owner)
            this.owner = new ObjectId(this.owner);

        this.model('Project').findById(this.project, function (err, project) {
            if (!project) {
                next(err || new Error('Unknown project'));
            } else {
                self.model('Workspace').findById(project.workspace, function (err, workspace) {
                    if (!workspace) {
                        next(err || new Error('Unknown workspace'));
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
        pathBuilder: function (callback) {
            var self = this;
            this.model('Project').findById(this.project, function (err, project) {
                callback(err, project.workspace + '_' + self.project + '_' + self.id)
            });
        }
    });

    module.exports = mongoose.model('Task', TaskSchema);

})();