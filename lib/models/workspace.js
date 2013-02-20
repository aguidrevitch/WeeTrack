(function () {

    var mongoose = require('mongoose');
    var _ = require('lodash');

    var WorkspaceSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        subdomain: {
            type: String,
            required: true
        },
        counter: {
            type: Number,
            default: 0
        },
        created: {
            type: Date,
            default: Date.now
        }
    });

    WorkspaceSchema.plugin(require('./plugins/object'), {
        subject: 'User',
        permissions: {
            'admin': true,
            'admincc': true,
            'cc': true
        },
        creatorPermission: 'admin',
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
        canGrant: function (who, what) {
            switch (who) {
                case 'admin':
                    return true;
                case 'admincc':
                    return what != 'admin';
                case 'cc':
                case 'owner':
                    return what == 'cc'
                default:
                    throw new Error('Uknown permission: ' + who);
            }
        },
        key: function () {
            return '_id';
        },
        pathBuilder: function (callback) {
            callback(null, this._id);
        },
        extractId: function (key) {
            return key[0];
        }
    });

    WorkspaceSchema.plugin(require('./plugins/changedattributes'));

    WorkspaceSchema.path('subdomain').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this.old('subdomain')) {
            this.model('Workspace').findOne({
                subdomain: value.toLowerCase()
            }, function (err, subdomain) {
                if (err) {
                    next(false);
                } else if (subdomain) {
                    next(false);
                } else {
                    next();
                }
            });
        } else {
            next();
        }
    }, 'taken');

    WorkspaceSchema.path('subdomain').validate(function (value, next) {
        if (value.toLowerCase().match(/^[a-z0-9]+$/)) {
            next()
        } else {
            next(false);
        }
    }, 'syntax');

    WorkspaceSchema.methods.getNextTicketId = function (callback) {
        return this.collection.findAndModify({ _id: this._id },
            [],
            {'$inc': {counter: 1}},
            {"new": true},
            callback);
    };

    module.exports = mongoose.model('Workspace', WorkspaceSchema);

})();