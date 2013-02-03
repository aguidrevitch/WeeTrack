(function () {

    var mongoose = require('mongoose');
    var bcrypt = require('bcrypt');
    var check = require('validator').check;
    var _ = require('lodash');
    var async = require('async');

    var UserSchema = new mongoose.Schema({
        name: {
            type: String,
        },
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
        }
    });

    UserSchema.index({
        email: 1,
        name: 1
    });

    UserSchema.plugin(require('./plugins/changedattributes'));

    UserSchema.virtual('scenario').set(function (value) {
        this._scenario = value;
    });

    UserSchema.virtual('scenario').get(function (value) {
        return this._scenario || 'register';
    });

    UserSchema.virtual('verifyPassword').set(function (value) {
        this._verifyPassword = value;
    });

    UserSchema.virtual('verifyPassword').get(function () {
        return this._verifyPassword;
    });

    UserSchema.path('name').validate(function (value, next) {
        if (this.scenario == 'register')
            next(!!value);
        else
            next();
    }, 'required');

    UserSchema.path('email').validate(function (value, next) {
        try {
            check(value).isEmail();
            next();
        } catch (e) {
            next(false);
        }
    }, 'valid');

    UserSchema.path('email').validate(function (value, next) {
        var self = this;
        if (this.isNew) {
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
            // changing email is forbidden
            next(false);
        }
    }, 'taken');

    UserSchema.path('password').validate(function (value, next) {
        if (this.scenario == 'register')
            next(!!value);
        else
            next()
    }, 'required');

    UserSchema.path('password').validate(function (value, next) {
        if (this.scenario == 'register') {
            if (value != this.verifyPassword) {
                next(false);
            } else {
                next();
            }
        } else {
            next();
        }
    }, 'verifyPassword');

    UserSchema.pre('save', function (next) {
        var self = this;
        if (this.password != this.old('password')) {
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

    UserSchema.statics.authorize = function (email, password, callback) {
        this.model('User').findOne({
            email: email
        }, null, function (err, user) {
            if (err) {
                callback(err);
                return;
            }

            if (user)
                bcrypt.compare(password, user.password, function (err, matches) {
                    if (matches)
                        callback(null, user);
                    else
                        callback();
                });
            else
                callback();
        });
    };

    UserSchema.plugin(require('./plugins/subject'))

    module.exports = mongoose.model('User', UserSchema);

})();