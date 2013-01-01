(function () {

    var mongoose = require('mongoose');
    var Workspace = require("./workspace");

    var ProjectSchema = new mongoose.Schema({
        acl_key: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        workspace: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        admins: Array,
        readers: Array
    });

    ProjectSchema.path('name').set(function (value) {
        this._old_name = this.name;
        return value;
    });

    ProjectSchema.path('workspace').set(function (value) {
        this._old_workspace = this.workspace;
        this.markModified('workspace');
        return value;
    });

    ProjectSchema.path('name').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_name) {
            this.model('Project').findOne({
                name: value
            }, function (err, name) {
                if (err) {
                    next(false);
                } else if (name) {
                    next(false);
                } else {
                    next();
                }
            });
        } else {
            next();
        }
    }, 'taken');

    ProjectSchema.path('workspace').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_workspace) {
            Workspace.findOne({
                _id: value
            }, function (err, workspace) {
                if (!workspace) {
                    next(false);
                } else {
                    next();
                }
            });
        } else {
            next();
        }
    }, 'workspace not exists');

    ProjectSchema.post('save', function (next) {
        this._old_name = this.name;
        this._old_workspace = this.workspace;
    });

    module.exports = mongoose.model('Project', ProjectSchema);

})();