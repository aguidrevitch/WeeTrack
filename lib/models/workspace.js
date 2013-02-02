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

    WorkspaceSchema.plugin(require('./plugins/withaccess'), {
        subject: 'User',
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

    WorkspaceSchema.post('init', function () {
        this._old_subdomain = this.subdomain;
    });

    WorkspaceSchema.path('subdomain').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_subdomain) {
            this.model('Workspace').findOne({
                subdomain: value.toLowerCase()
            }, function (err, subdomain) {
                if (err) {
                    next(false);
                } else if (subdomain) {
                    console.log(value + ' found');
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

    WorkspaceSchema.post('save', function () {
        this._old_subdomain = this.subdomain;
    });

    WorkspaceSchema.methods.getNextTicketId = function (callback) {
        return this.collection.findAndModify({ _id: this._id },
            [],
            {'$inc': {counter: 1}},
            {"new": true},
            callback);
    };

    module.exports = mongoose.model('Workspace', WorkspaceSchema);

})();