(function () {

    var mongoose = require('mongoose');

    var TransactionSchema = new mongoose.Schema({
        type: {
            type: String
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true
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

    module.exports = mongoose.model('Transaction', TransactionSchema);

})();