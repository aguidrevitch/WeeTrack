(function () {

    var _ = require('lodash');
    var Task = require("../../models/task");
    var ObjectId = require('mongoose').Types.ObjectId;

    module.exports = {
        setup: function (app, helper) {

            /* list */
            app.get('/api/task/:workspace', function (req, res) {
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
            app.get('/api/task/:workspace/:id', function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = {};

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('No workspace'));
                    return;
                }

                condition.id = req.params.id;

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                return Task.findOneWithAccess(req.user, perms, condition, function (err, model) {
                    if (err) {
                        res.error(err);
                    } else if (!model) {
                        res.json(model);
                    } else {
                        model.user = req.user;
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
            app.post('/api/task/:workspace', function (req, res) {
                var task = new Task(_.extend({}, req.body, {
                    filemanager: req.filemanager,
                    creator: req.user,
                    user: req.user
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
                            });
                        }
                    });
                }
            });

            /* update */
            app.put('/api/task/:workspace/:id', function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = {};
                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('No workspace'));
                    return;
                }

                condition.id = req.params.id;

                if (req.query.watch) {
                    Task.findOneWithAccess(req.user, perms, condition, function (err, workspace) {
                        if (err) {
                            res.error(err);
                        } else if (!workspace) {
                            res.error(new Error('Access denied'));
                        } else {
                            if (req.query.watch == 'true') {
                                workspace.watch(req.user, function (err, model) {
                                    if (err) {
                                        res.error(err)
                                    } else {
                                        res.json(model)
                                    }
                                });
                            } else {
                                workspace.unwatch(req.user, function (err, model) {
                                    if (err) {
                                        res.error(err)
                                    } else {
                                        res.json(model)
                                    }
                                });
                            }
                        }
                    });
                } else {
                    Task.findOneWithAccess(req.user, perms, condition, function (err, task) {
                        if (err) {
                            res.error(err);
                        } else if (!task) {
                            res.error(new Error('Access Denied'));
                        } else {
                            task.set(req.body);
                            task.user = req.user;
                            task.filemanager = req.filemanager;
                            var method = req.query.validate == 'true' ? 'validate' : 'save';
                            task[method].call(task, function (err, model) {
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
                }
            });
        }
    }

})();