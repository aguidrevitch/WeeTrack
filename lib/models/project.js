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

    ProjectSchema.path('name').set(function (value) {
        this._old_name = this.name;
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

    module.exports = mongoose.model('Project', ProjectSchema);

})();