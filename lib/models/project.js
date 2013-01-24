(function () {

    var mongoose = require('mongoose');

    var ProjectSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        created: {
            type: Date,
            default: Date.now
        }
    });

    ProjectSchema.plugin(require('./plugins/withaccess'), {
        subject: 'User',
        pathBuilder: function () {
            return this.workspace + '_' + this._id;
        }
    });

    ProjectSchema.post('init', function (next) {
        this._old_workspace = this.workspace;
        this._old_email = this.email;

    });

    ProjectSchema.path('email').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_email) {
            this.model('Project').findOne({
                workspace: this.workspace,
                email: value
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
        console.log(value, this._old_workspace);
        if (!this.isNew && value != this._old_workspace) {
            next(false);
        } else {
            next();
        }
    }, 'workspace update');

    ProjectSchema.path('workspace').validate(function (value, next) {
        var self = this;
        if (this.isNew) {
            this.model('User').findById(this.creator, function (err, user) {
                if (!user) {
                    next(false)
                } else {
                    self.model('Workspace').findByIdWithAccess(user, 'cc', value, function (err, workspace) {
                        if (!workspace) {
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
    }, 'workspace allowed');

    ProjectSchema.post('save', function (next) {
        this._old_workspace = this.workpace;
        this._old_email = this.email;
    });

    module.exports = mongoose.model('Project', ProjectSchema);

})();