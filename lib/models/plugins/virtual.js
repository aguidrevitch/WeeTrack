var _ = require('lodash');

module.exports = function (schema, options) {

    _.each(options.methods, function (method) {
        schema.virtual(method).set(function (value) {
            this['_' + method] = value;
        });
        schema.virtual(method).get(function (value) {
            return this['_' + method];
        });
    });

};