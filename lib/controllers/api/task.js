(function () {

    var _ = require('lodash');
    var Task = require("../../models/task");
    var ObjectId = require('mongoose').Types.ObjectId;

    module.exports = {
        setup: function (app, authorizedOnly) {

            /* list */
            app.get('/api/task/:workspace', authorizedOnly, function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = {}, subdomain;

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('No workspace'));
                    return;
                }

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                return Task.findWithAccess(req.user, perms, condition, function (err, models) {
                    if (err) {
                        res.error(err);
                    } else {
                        res.json(models);
                    }
                });
            });

            /* get */
            app.get('/api/task/:workspace/:id', authorizedOnly, function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = { id: req.params.id };

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('No workspace'));
                    return;
                }

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                return Task.findOneWithAccess(req.user, perms, condition, function (err, model) {
                    if (err) {
                        res.error(err);
                    } else if (!model) {
                        res.json(model);
                    } else {
                        model.updater = req.user;
                        model.transactions(function (err, transactions) {
                            if (err) {
                                res.error(err);
                            } else {
                                res.json(_.extend(model, {
                                    transactions: transactions
                                }));
                            }
                        });
                    }
                });
            });

            /* create */
            app.post('/api/task/:workspace', authorizedOnly, function (req, res) {
                var task = new Task(_.extend({}, req.body, {
                    creator: req.user,
                    updater: req.user
                }));

                if (req.query.validate) {
                    task.validate(function (err) {
                        if (err) {
                            res.error(err);
                        } else {
                            res.json(task);
                        }
                    });
                } else {
                    task.save(function (err) {
                        if (err) {
                            res.error(err);
                        } else {
                            task.transactions(function (err, transactions) {
                                if (err) {
                                    res.error(err);
                                } else {
                                    res.json(_.extend(task, {
                                        transactions: transactions
                                    }));
                                }
                            });
                        }
                    });
                }
            });

            /* update */
            app.put('/api/task/:workspace/:id', authorizedOnly, function (req, res) {
                var condition = { id: req.params.id };

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('No workspace'));
                    return;
                }

                Task.findOneWithAccess(req.user, ['admin', 'admincc', 'cc', 'owner'], condition, function (err, task) {
                    if (err) {
                        res.error(err);
                    } else if (!task) {
                        res.error(new Error('Access Denied'));
                    } else {
                        task.set(req.body);
                        task.updater = req.user;
                        task.save(function (err, model) {
                            if (err) {
                                res.error(err);
                            } else {
                                model.transactions(function (err, transactions) {
                                    if (err) {
                                        res.error(err);
                                    } else {
                                        res.json(_.extend(model, {
                                            transactions: transactions
                                        }));
                                    }
                                })
                            }
                        });
                    }
                });
            });
        }
    }
})();