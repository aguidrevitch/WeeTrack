(function () {

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
                    console.log(e);
                    res.json(new Error('No workspace'));
                    return;
                }

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);
                return Task.findWithAccess(req.user, perms, condition, function (err, models) {
                    if (err) {
                        res.modal(err);
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
                    res.modal(new Error('No workspace'));
                    return;
                }

                condition.id = req.params.id;

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                return Task.findOneWithAccess(req.user, perms, condition, function (err, model) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(model);
                    }
                });
            });

            /* create */
            app.post('/api/task/:workspace', function (req, res) {
                var task = new Task(req.body);
                task.creator = req.user;
                task.save(function (err, model) {
                    if (err) {
                        res.json(500, {
                            error: err.errors
                        });
                    } else {
                        res.json(model);
                    }
                });
            });

            /* update */
            app.put('/api/task/:workspace/:id', function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = {};
                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.modal(new Error('No workspace'));
                    return;
                }

                condition.id = req.params.id;

                if (req.query.watch) {
                    Task.findOneWithAccess(req.user, perms, condition, function (err, workspace) {
                        if (err) {
                            res.modal(err);
                        } else if (!workspace) {
                            res.modal('Access denied');
                        } else {
                            if (req.query.watch == 'true') {
                                workspace.watch(req.user, function (err, model) {
                                    if (err) {
                                        res.modal(err)
                                    } else {
                                        res.json(model)
                                    }
                                });
                            } else {
                                workspace.unwatch(req.user, function (err, model) {
                                    if (err) {
                                        res.modal(err)
                                    } else {
                                        res.json(model)
                                    }
                                });
                            }
                        }
                    });
                } else {
                    Task.findOneWithAccess(req.user, perms, condition, function (err, model) {
                        if (err) {
                            res.modal(err);
                        } else if (!model) {
                            res.modal('Access Denied');
                        } else {
                            model.set(req.body);
                            model.save(function (err, model) {
                                if (err) {
                                    res.json(500, {
                                        error: err.errors
                                    });
                                } else {
                                    res.json(model);
                                }
                            });
                        }
                    });
                }
            });
        }
    }

})();