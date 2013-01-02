(function () {

    var Workspace = require("../../models/workspace");

    module.exports = {
        setup: function (app) {


            /* list */
            app.get('/api/workspace', function (req, res) {
                return Workspace.findWithAccess(req.user, 'admin', {}, function (err, workspaces) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(workspaces);
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
            app.put('/api/workspace', function (req, res) {
                Workspace.findByIdWithAccess(req.user, 'admin', req.body._id,
                    function (err, workspace) {
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
