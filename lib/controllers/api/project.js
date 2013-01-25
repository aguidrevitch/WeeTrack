(function () {

    var Project = require("../../models/project");

    module.exports = {
        setup: function (app) {

            /* list */
            app.get('/api/project', function (req, res) {
                return Project.findWithAccess(req.user, 'admin', {}, function (err, models) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(models);
                    }
                });
            });

            /* get */
            app.get('/api/project/:id', function (req, res) {
                return Project.findByIdWithAccess(req.user, 'admin', req.params.id, function (err, model) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(model);
                    }
                });
            });

            /* create */
            app.post('/api/project', function (req, res) {
                var project = new Project(req.body);
                project.creator = req.user;
                project.save(function (err, model) {
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
            app.put('/api/project/:id', function (req, res) {
                Project.findByIdWithAccess(req.user, 'admin', req.params.id, function (err, model) {
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
                })
            });
        }
    };

})();