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
        salt: {
            type: String
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
                var salt = bcrypt.genSaltSync(10);
                self.set({
                    password: bcrypt.hashSync(self.password, salt),
                    salt: salt
                });
                next();
            }
        });
    }, 'Already taken');
    
    module.exports = User;

})();