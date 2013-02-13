(function () {

    var _ = require('lodash');
    var Task = require("../../models/task");
    var Transaction = require("../../models/transaction");
    var Storage = require("../../models/storage");
    var ObjectId = require('mongoose').Types.ObjectId;

    module.exports = {
        setup: function (app, authorizedOnly) {

            /* get */
            app.get('/api/file/:workspace/:id/:file', authorizedOnly, function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = {};

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('Access Denied'));
                    return;
                }

                condition.id = req.params.id;

                Task.findOneWithAccess(req.user, perms, condition, function (err, model) {
                    if (err) {
                        res.error(err);
                    } else if (!model) {
                        res.error(new Error("Access Denied"));
                    } else {
                        Transaction.findOne({
                            task: model._id,
                            subtype: 'file',
                            value: req.params.file
                        }, function (err, transaction) {
                            if (err) {
                                res.error(err);
                            } else {
                                res.set('Content-Type', transaction.meta.type);
                                res.download(Storage.location(req.params.file), transaction.meta.name);
                            }
                        });
                    }
                });
            });
        }
    };
})();