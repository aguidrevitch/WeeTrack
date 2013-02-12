(function () {

    var mongoose = require('mongoose');

    var TransactionSchema = new mongoose.Schema({
        task: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        type: {
            type: String
        },
        subtype: {
            type: String
        },
        value: {
            type: String
        },
        meta: {
            type: Object
        },
        previousValue: {
            type: String
        },
        creator : {
            type: Object,
            required: true
        },
        created: {
            type: Date,
            default: Date.now
        }
    });

    TransactionSchema.path('type').validate(function (value, next) {
        switch (value) {
            case "comment":
            case "reply":
                next();
                break;
            default:
                next(false);
        }
    }, 'type');

    TransactionSchema.path('subtype').validate(function (value, next) {
        switch (value) {
            case "text":
            case "file":
                next();
                break;
            default:
                next(false);
        }
    }, 'subtype');

    TransactionSchema.path('value').validate(function (value, next) {
        switch (this.subtype) {
            case "text":
            case "file":
                if (!value) {
                    next(false);
                    return;
                }
            default:
        }
        next();
    }, 'required');

    module.exports = mongoose.model('Transaction', TransactionSchema);

})();