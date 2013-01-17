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
        pathBuilder: function () {
            return this._id;
        }
    });

    WorkspaceSchema.path('subdomain').set(function (value) {
        this._old_subdomain = this.subdomain;
        return value;
    });

    WorkspaceSchema.path('subdomain').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_subdomain) {
            this.model('Workspace').findOne({
                subdomain: value.toLowerCase()
            }, function (err, subdomain) {
                if (err) {
                    next(err);
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

    WorkspaceSchema.pre('save', function (next) {
        this._old_subdomain = this.subdomain;
        next();
    });

    WorkspaceSchema.methods.getTicketId = function (callback) {
        return this.collection.findAndModify({ _id: this._id },
            [],
            {'$inc': {counter: 1}},
            {"new": true},
            callback);
    };

    module.exports = mongoose.model('Workspace', WorkspaceSchema);

})();