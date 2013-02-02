(function () {

    var Task = require("../../models/task");
    var ObjectId = require('mongoose').Types.ObjectId;;

    module.exports = {
        setup: function (app, helper) {

            /* list */
            app.get('/api/task', function (req, res) {
                var perms = ['admin'], subdomain;
                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                var options = {};
                if (req.query.workspace)
                    options.workspace = ObjectId.fromString(req.query.workspace);

                return Task.findWithAccess(req.user, perms, options, function (err, models) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(models);
                    }
                });
            });

            /* get */
            app.get('/api/task/:id', function (req, res) {
                var perms = ['admin'], subdomain;
                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                return Task.findOneWithAccess(req.user, perms, { id: req.params.id }, function (err, model) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(model);
                    }
                });
            });

            /* create */
            app.post('/api/task', function (req, res) {
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
            app.put('/api/task/:id', function (req, res) {
                if (req.query.watch) {
                    Workspace.findByIdWithAccess(req.user, ['admin', 'admincc', 'cc', 'owner'], req.params.id, function (err, workspace) {
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
                    Task.findByIdWithAccess(req.user, ['admin'], req.params.id, function (err, model) {
                        if (err) {
                            res.modal(err);
                        } else if (model) {
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
                        } else {
                            res.modal('Project not found');
                        }
                    });
                }
            });
        }
    }

})();