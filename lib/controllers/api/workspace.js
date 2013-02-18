(function () {

    var Workspace = require("../../models/workspace");

    module.exports = {
        setup: function (app, authorizedOnly) {


            /* list */
            app.get('/api/workspace', authorizedOnly, function (req, res) {
                var perms = ['visible'], subdomain;
                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                var options = {}
                if (req.query.subdomain)
                    options.subdomain = req.query.subdomain;

                Workspace.findWithAccess(req.user, perms, options, function (err, workspaces) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(workspaces);
                    }
                });
            });

            /* get */
            app.get('/api/workspace/:id', authorizedOnly, function (req, res) {
                var perms = ['visible'];
                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                Workspace.findByIdWithAccess(req.user, perms, req.params.id, function (err, workspace) {
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
            app.post('/api/workspace', authorizedOnly, function (req, res) {
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
            app.put('/api/workspace/:id', authorizedOnly, function (req, res) {
                Workspace.findByIdWithAccess(req.user, ['admin'], req.params.id, function (err, workspace) {
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
            });
        }
    }

})();
