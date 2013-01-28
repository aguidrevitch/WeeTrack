(function () {

    var mongoose = require('mongoose');
    var bcrypt = require('bcrypt');
    var check = require('validator').check;
    var _ = require('lodash');
    var async = require('async');
    var ObjectId = mongoose.Types.ObjectId;

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
        },
        acl: {
            type: Object
        }
    });

    UserSchema.index({
        email: 1,
        name: 1
    });

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

    UserSchema.path('email').set(function (value, self) {
        this._old_email = this.email;
        return value;
    });

    UserSchema.path('password').set(function (value, self) {
        this._old_password = this.password;
        return value;
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

    UserSchema.statics.findByIdOrCreateWithEmail = function (id_or_email, callback) {
        var self = this;
        try {
            this.findOne({ _id: new ObjectId(id_or_email.toString()) }, callback);
        } catch (e) {
            var User = this.model('User');
            user = new User({
                scenario: 'auto',
                email: id_or_email
            });
            user.save(callback);
        }
    };

    /*
     * admin - can add new projects
     * admincc - can see everything
     * cc - can see only replies, cannot see comments
     * watch - email subscription
     */
    UserSchema.statics._grant = function (user_id, key, perms, callback) {
        var update = {};
        _.each((perms || []), function (perm) {
            update['acl.' + perm + '.' + key] = true
        });
        this.update({ _id: new ObjectId(user_id.toString()) }, update, callback);
    }

    UserSchema.statics.grant = function (user_id, key, perms, callback) {
        var self = this;
        if (user_id) {
            this.findByIdOrCreateWithEmail(user_id, function (err, user) {
                if (!user) {
                    callback(err || 'User not found');
                } else {
                    self._grant(user._id, key, perms, callback);
                }
            });
        }
    };

    UserSchema.statics.revoke = function (user_id, key, perms, callback) {
        var update = {};
        _.each(perms, function (perm) {
            update['acl.' + perm + '.' + key] = true
        });
        this.update({ _id: new ObjectId(user_id.toString()) }, { $unset: update }, callback);
    }

    UserSchema.methods.keysWithAccess = function (perms) {
        var result = [];
        _.each(perms, function (perm) {
            _.each((this.acl || {})[perm], function (value, key) {
                result.push(key);
            })
        }, this);
        return result;
    };

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

    module.exports = mongoose.model('User', UserSchema);

})();