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
                Workspace.findByIdWithAccess(req.user, 'admin', req.params.id, function (err, workspace) {
                    if (err) {
                        res.modal(err);
                    } else if (workspace) {
                        workspace.set({
                            name: req.body.name,
                            subdomain: req.body.subdomain,
                            administrators: req.body.administrators,
                            users: req.body.users,
                            clients: req.body.clients
                        });
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
                })
            });
        }
    }

})();
