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
    
    UserSchema.index({
        email: 1
    });
    
    UserSchema.virtual('verifyPassword').set(function (value) {
        this._verifyPassword = value;
    }); 
    
    UserSchema.virtual('verifyPassword').get(function () {
        return this._verifyPassword;
    });
    
    UserSchema.path('email').set(function (value, self) {
        this._old_email = this.email;
        return value;
    });

    UserSchema.path('password').set(function (value, self) {
        this._old_password = this.password;
        return value;
    });
    
    UserSchema.path('email').validate(function (value, next) {
        var self = this;
        if (this.isNew || value != this._old_email) {
            this.model('User').findOne({
                email: value.toLowerCase()
            }, function (err, user) {
                if (err) {
                    next(false);
                } else if (user) {
                    next(false);
                } else {
                    next();
                }
            });
        } else {
            next();
        }
    }, 'taken');
    
    UserSchema.path('password').validate(function (value, next) {
        if (value != this.verifyPassword) {
            next(false);
        } else {
            next();
        }
    }, 'verifyPassword');
    
    UserSchema.pre('save', function (next) {
        var self = this;
        if (this.password != this._old_password) {
            if (this.password == this.verifyPassword) {
                bcrypt.hash(this.password, 8, function (err, hash) {
                    self.password = hash;
                    self.verifyPassword = hash;
                    next(err);
                });
                return;
            }
        }
        next();
    
    });
    
    UserSchema.post('save', function (next) {
        this._old_email = this.email;
        this._old_password = this.password;
    });

    module.exports = mongoose.model('User', UserSchema);

})();