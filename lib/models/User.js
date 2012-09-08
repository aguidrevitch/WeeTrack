(function () {

    var mongoose = require('mongoose');

    var UserSchema = new mongoose.Schema({
        name: { type: String },
        email: { type: String },
        password: { type: String }
    });

    exports.User = mongoose.model('User', UserSchema);

})();