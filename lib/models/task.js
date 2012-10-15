(function () {

    var mongoose = require('mongoose');
    var Project = require('./project');

    var TaskSchema = new mongoose.Schema({
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
            Project.findOne({
                _id : value,
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

    TaskSchema.post('save', function (next) {
        this._old_project = this.project;
    });

    module.exports = mongoose.model('Task', TaskSchema);

})();