var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

module.exports = function (schema, options) {

    options || (options = {});

    if (!options.pathBuilder)
        throw new Error('No path builder specified');

    if (!options.subject)
        throw new Error('No subject specified');

    schema.add({
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: options.subject,
            required: true
        },
        path: {
            type: String,
            required: true
        }
    });

    schema.virtual('administrators').set(function (value) {
        this._administrators = value;
    });

    schema.virtual('administrators').get(function () {
        return this._administrators;
    });

    schema.virtual('users').set(function (value) {
        this._users = value;
    });

    schema.virtual('users').get(function () {
        return this._users;
    });

    schema.virtual('clients').set(function (value) {
        this._clients = value;
    });

    schema.virtual('clients').get(function () {
        return this._clients;
    });

    /* middlewares */
    schema.pre('validate', function (next) {
        this.path = options.pathBuilder.call(this);
        next();
    });

    schema.pre('save', function (next) {
        var Subject = this.model(options.subject);
        var grants = [_.bind(function (callback) {
            Subject.grant(this.creator, this._id, ['admin', 'admincc', 'cc'], callback);
        }, this)];

        _.each(this.administrators, function (user_id) {
            grants.push(_.bind(function (callback) {
                Subject.grant(user_id, this._id, ['admin', 'admincc', 'cc'], callback);
            }, this));
        }, this);
        _.each(this.users, function (user_id) {
            grants.push(_.bind(function (callback) {
                Subject.grant(user_id, this._id, ['admincc', 'cc'], callback);
            }, this));
        }, this);
        _.each(this.clients, function (user_id) {
            grants.push(_.bind(function (callback) {
                Subject.grant(user_id, this._id, ['cc'], callback);
            }, this));
        }, this);

        /* granting permissions in parallel */
        async.parallel(grants, function (err) {
            next(err);
        });
    });

    schema.statics.buildCriteria = function (user, perms, conditions) {
        var keys = user.keysWithAccess(perms);
        var or = keys.map(function(key) {
            return { path: new RegExp("^" + key) };
        });
        return { $and: [ conditions, { $or : or } ] };
    }

    schema.statics.findWithAccess = function (user, perms, conditions, fields, options, callback) {
        var cursor = this.find.apply(this, [this.buildCriteria(user, perms, conditions), fields, options, callback]);
        if (callback)
            cursor.exec(callback);
    };

    schema.statics.findOneWithAccess = function (user, perms, conditions, fields, options, callback) {
        var cursor = this.findOne.apply(this, [this.buildCriteria(user, perms, conditions), fields, options, callback]);
        if (callback)
            cursor.exec(callback);
    };

    schema.statics.findByIdWithAccess = function (user, perms, id, fields, options, callback) {
        return this.findOneWithAccess(user, perms, { _id: id }, fields, options, callback);
    };

};
