(function () {

    var mongoose = require('mongoose');

    var TransactionSchema = new mongoose.Schema({
        type: {
            type: String
        },
        subtype: {
            type: String
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String
        },
        url: {
            type: String
        },
        filename: {
            type: String
        },
        assigned_to: {
            type: mongoose.Schema.Types.ObjectId
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
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
            case "assign":
                next();
                break;
            default:
                next(false);
        }
    }, 'subtype');

    module.exports = mongoose.model('Transaction', TransactionSchema);

})();