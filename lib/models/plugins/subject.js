var _ = require('lodash');
var ObjectId = require('mongoose').Types.ObjectId;

module.exports = function (schema, options) {

    options || (options = {});

    schema.add({
        acl: {
            type: Object
        },
        visibility: {
            type: Array
        }
    });

    /*
     * admin - can add new projects
     * admincc - can see everything
     * cc - can see only replies, cannot see comments
     */
    schema.statics._grant = function (user, key, perms, callback) {
        var update = {};

        _.each(perms, function (perm) {
            var exists = _.find(user.acl, function (record) {
                return record.path == key && record.perm == perm;
            });
            if (!exists) {
                update.$pushAll = update.$pushAll || {'acl': []};
                update.$pushAll.acl.push({ path: key, perm: perm })
            }
        }, this)

        // adding workspace link
        var visibility_key = (key.split("_"))[0];
        if (!user.visibility || _.indexOf(user.visibility, visibility_key) == -1) {
            update.$pushAll = update.$pushAll || {};
            update.$pushAll.visibility = [ visibility_key ];
        }

        if (update.$pushAll)
            this.update({ _id: user._id }, update, callback);
        else
            callback(null);
    }

    schema.statics._revoke = function (user, key, perms, callback) {
        var update = {};
        _.each(perms, function (perm) {
            var exists = _.find(user.acl, function (record) {
                return record.path == key && record.perm == perm;
            });
            if (exists) {
                update.$pullAll = update.$pull || {'acl': []};
                update.$pullAll.acl.push({ path: key, perm: perm })
            }
        }, this)

        if (update.$pullAll)
            this.update({ _id: user._id }, update, callback);
        else
            callback(null);
    }

    schema.statics.grant = function (user_id, key, perms, callback) {
        if (user_id) {
            var self = this;
            this.findByIdOrEmailOrCreate(user_id, function (err, user) {
                if (!user) {
                    callback(err)
                } else {
                    self._grant(user, key, perms, callback);
                }
            });
        } else {
            callback(new Error('No user id given'))
        }
    };

    schema.statics.revoke = function (user_id, key, perms, callback) {
        if (user_id) {
            var self = this;
            this.findById(user_id, function (err, user) {
                if (!user) {
                    callback(err)
                } else {
                    self._revoke(user, key, perms, callback);
                }
            });
        } else {
            callback(new Error('No user id given'))
        }
    };

    schema.methods.keysWithAccess = function (perms) {
        var result = [];
        _.each(perms, function (perm) {
            _.each((this.acl || {}), function (record) {
                if (record.perm == perm)
                    result.push(record.path);
            })
        }, this);
        return result;
    };

    schema.methods.getAccessTo = function (key) {
        var result = {};
        _.each(this.acl, function (record) {
            // this split shouldnt be here
            var path = (record.path.split("_"))[0];
            var re = new RegExp("^" + path);
            if (key.match(re))
                result[ record.perm ] = true;
        });
        return _.keys(result);
    };

    schema.statics.findByIdOrEmail = function (id_or_email, callback) {
        var self = this;
        try {
            // converting to id explicitely to catch the error
            // or else error will be returned to callback
            this.findOne({ _id: ObjectId.fromString(id_or_email.toString()) }, callback);
        } catch (e) {
            this.findOne({ email: id_or_email }, callback);
        }
    };

    schema.statics.findByIdOrEmailOrCreate = function (id_or_email, callback) {
        var self = this;
        this.findByIdOrEmail(id_or_email, function (err, model) {
            if (err) {
                callback(err);
            } else if (model) {
                callback(null, model);
            } else {
                var User = self.model('User');
                user = new User({
                    scenario: 'auto',
                    email: id_or_email
                });
                user.save(callback);
            }
        });
    };

};