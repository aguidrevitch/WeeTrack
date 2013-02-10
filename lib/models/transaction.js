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
        content: {
            type: String
        },
        filename: {
            type: String
        },
        thumbnail_filename: {
            type: String
        },
        creator : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
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
            case "owner":
                next();
                break;
            default:
                next(false);
        }
    }, 'subtype');

    TransactionSchema.path('content').validate(function (value, next) {
        if (this.subtype == 'text' && !value)
            next(false);
        else
            next();
    }, 'required');

    TransactionSchema.path('filename').validate(function (value, next) {
        if (this.subtype == 'file' && !value)
            next(false);
        else
            next();
    }, 'required');

    module.exports = mongoose.model('Transaction', TransactionSchema);

})();