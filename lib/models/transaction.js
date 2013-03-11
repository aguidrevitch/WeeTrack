(function () {

    var mongoose = require('mongoose'),
        _ = require('lodash');

    var TransactionSchema = new mongoose.Schema({
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true
        },
        type: {
            type: String
        },
        subtype: {
            type: String
        },
        previousValue: {
            type: mongoose.Schema.Types.Mixed
        },
        value: {
            type: mongoose.Schema.Types.Mixed
        },
        meta: {
            type: Object
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
            case "status":
            case "priority":
            case "owner":
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
                break;
            case "status":
                if (_.indexOf(['new', 'open', 'closed', 'resolved'], value) == -1) {
                    next(false);
                    return;
                }
                break;
            default:
        }
        next();
    }, 'required');

    module.exports = mongoose.model('Transaction', TransactionSchema);

})();