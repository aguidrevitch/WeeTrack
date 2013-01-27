define(["backbone"], function (Backbone) {

    var Transaction = {};

    Transaction.Model = Backbone.Model.extend({
        url: '/api/transaction',
        idAttribute: "_id",
        url: function () {
            return this.id ? '/api/transaction/' + this.id : '/api/transaction';
        }
    });

    Transaction.Collection = Backbone.Collection.extend({
        url: '/api/transaction',
        model: Transaction.Model
    });

    return Transaction;

});