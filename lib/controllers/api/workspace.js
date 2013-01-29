(function () {

    var Workspace = require("../../models/workspace");

    module.exports = {
        setup: function (app) {


            /* list */
            app.get('/api/workspace', function (req, res) {
                var perm = 'admin', subdomain;
                if (req.query.perm)
                    perm = req.query.perm;

                var options = {}
                if (req.query.subdomain)
                    options.subdomain = req.query.subdomain;

                Workspace.findWithAccess(req.user, perm, options, function (err, workspaces) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(workspaces);
                    }
                });
            });

            /* get */
            app.get('/api/workspace/:id', function (req, res) {
                var perm = 'admin';
                if (req.query.perm)
                    perm = req.query.perm;

                Workspace.findByIdWithAccess(req.user, perm, req.params.id, function (err, workspace) {
                    if (err) {
                        res.modal(err);
                    } else if (!workspace) {
                        res.modal('Access denied');
                    } else {
                        res.json(workspace);
                    }
                });
            });

            /* create */
            app.post('/api/workspace', function (req, res) {
                var workspace = new Workspace(req.body);
                workspace.creator = req.user;
                workspace.save(function (err, model) {
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
            app.put('/api/workspace/:id', function (req, res) {
                if (req.query.watch) {
                    Workspace.findByIdWithAccess(req.user, 'cc', req.params.id, function (err, workspace) {
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
                    Workspace.findByIdWithAccess(req.user, 'admin', req.params.id, function (err, workspace) {
                        if (err) {
                            res.modal(err);
                        } else if (workspace) {
                            workspace.set(req.body);
                            workspace.save(function (err, model) {
                                if (err) {
                                    res.json(500, {
                                        error: err.errors
                                    });
                                } else {
                                    res.json(model);
                                }
                            });
                        } else {
                            res.modal('Workspace not found');
                        }
                    });
                }
            });
        }
    }

})();
