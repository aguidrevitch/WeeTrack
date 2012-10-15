(function () {
    
    var mongoose = require('mongoose');
    
    var WorkspaceSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        subdomain: {
            type: String,
            required: true
        },
        owners: Array,
        admins: Array,
        readers: Array
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

    WorkspaceSchema.post('save', function () {
        this._old_subdomain = this.subdomain;
    });

    module.exports = mongoose.model('Workspace', WorkspaceSchema);

})();