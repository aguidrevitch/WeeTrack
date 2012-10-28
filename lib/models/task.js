(function () {

    var mongoose = require('mongoose');

    var TaskSchema = new mongoose.Schema({
        id: {
            type: Number,
            required: true
        },
        subject: {
            type: String,
            required: true
        },
        project: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        owner: {
            type: mongoose.Schema.Types.Mixed
        },
        admins: Array,
        guests: Array
    });

    TaskSchema.path('project').set(function (value) {
        this._old_project = this.project;
        this.markModified('project');
        return value;
    });

    TaskSchema.path('project').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_name) {
            this.model('Project').findOne({
                _id: value,
                workspace: this.workspace
            }, function (err, project) {
                if (!project) {
                    next(false);
                } else {
                    self.project = project._id;
                    next();
                }
            });
        } else {
            next();
        }
    }, 'project not exists');

    TaskSchema.pre('validate', function (next) {
        var self = this;
        if (this.isNew) {
            this.model('Workspace').findOne({
                _id: this.workspace
            }, function (err, workspace) {
                if (err) {
                    next(err);
                } else {
                    workspace.getTicketId(function (err, updated) {
                        if (err) {
                            next(err);
                        } else {
                            self.id = updated.counter;
                            next();
                        }
                    })
                }
            });
        } else {
            next();
        }
    });

    TaskSchema.post('save', function (next) {
        this._old_project = this.project;
    });

    module.exports = mongoose.model('Task', TaskSchema);

})();