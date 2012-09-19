(function () {
    
    var mongoose = require('mongoose');
    var bcrypt = require('bcrypt');
    
    var UserSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        confirmed: {
            type: Boolean,
            'default': false
        }
    });
    
    var User = mongoose.model('User', UserSchema);
    
    User.schema.path('email').validate(function (value, next) {
        var self = this;
        User.findOne({
            email: this.email.toLowerCase()
        }, function (err, user) {
            if (err) {
                next(false);
            } else if (user) {
                next(false);
            } else {
                next();
            }
        });
    }, 'Already taken');
    
    //User.schema.pre('save', function () {
    //   });
    
    module.exports = User;

})();