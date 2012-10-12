(function () {
    
    var mongoose = require('mongoose');
    
    var ProjectSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        admins: Array,
        guests: Array
    });

    module.exports = mongoose.model('Project', ProjectSchema);

})();