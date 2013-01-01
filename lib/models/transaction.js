(function () {

    var mongoose = require('mongoose');

    var TransactionSchema = new mongoose.Schema({
        acl_key: {
            type: String,
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
        url: {
            type: String
        },
        thumbnail_url: {
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
            case "assign":
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

    TransactionSchema.path('url').validate(function (value, next) {
        if (this.subtype == 'file' && !value)
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