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
        guests: Array
    });
    
    var Workspace = mongoose.model('Workspace', WorkspaceSchema);
    
    Workspace.schema.path('subdomain').validate(function (value, next) {
        var self = this;
        Workspace.findOne({
            subdomain: this.subdomain.toLowerCase()
        }, function (err, subdomain) {
            if (err) {
                next(false);
            } else if (subdomain) {
                next(false);
            } else {
                next();
            }
        });
    }, 'Already taken');
    
    module.exports = Workspace;

})();