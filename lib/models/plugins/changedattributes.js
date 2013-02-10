var _ = require('lodash');

module.exports = function (schema) {

    var attrs = [];

    schema.eachPath(function (attr, options) {
        if (attr != "_id")
            attrs.push(attr);
    });

    schema.pre('init', function (next, attributes) {
        _.each(attrs, function (attr) {
            this['_old_' + attr] = attributes[attr];
        }, this);
        next();
    });

    schema.methods.old = function (attr) {
        return this['_old_' + attr];
    }

};