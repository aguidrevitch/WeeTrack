(function () {

    var mongoose = require('mongoose'),
        _ = require('lodash');

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
            ref: 'Workspace',
            required: true
        },
        created: {
            type: Date,
            default: Date.now
        }
    });

    ProjectSchema.plugin(require('./plugins/changedattributes'));

    ProjectSchema.path('email').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this.old('email')) {
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
        // changing project's workspace is not allowed yet
        if (!this.isNew && value.toString() != this.old('workspace').toString()) {
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
                    // must be admin in selected workspace
                    self.model('Workspace').findByIdWithAccess(user, ['admin'], value, function (err, workspace) {
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

    ProjectSchema.plugin(require('./plugins/object'), {
        subject: 'User',
        permissions: {
            'admin': true,
            'admincc': true,
            'cc': true
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
                return _.indexOf(['path', 'creator'], prop) == -1;
            if (role == 'admincc')
                return _.indexOf(['admincc', 'cc', 'owner'], prop) != -1;
            if (role == 'cc' || role == 'owner')
                return _.indexOf(['cc', 'owner'], prop) != -1;
            return false;
        },
        key: function () {
            return '_id';
        },
        pathBuilder: function (callback) {
            callback(null, this.workspace + '_' + this._id);
        },
        extractId: function (key) {
            return key[1];
        }
    });

    module.exports = mongoose.model('Project', ProjectSchema);

})();