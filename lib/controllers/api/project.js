(function () {

    var mongoose = require('mongoose'),
        Project = mongoose.model('Project'),
        ObjectId = mongoose.Types.ObjectId;

    module.exports = {
        setup: function (app) {

            /* list */
            app.get('/api/project', function (req, res) {
                var perms = ['visible'];
                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                var options = {};
                if (req.query.workspace)
                    options.workspace = ObjectId.fromString(req.query.workspace);

                return Project.findWithAccess(req.user, perms, options, function (err, models) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(models);
                    }
                });
            });

            /* get */
            app.get('/api/project/:id', function (req, res) {
                var perms = ['visible'];
                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                return Project.findByIdWithAccess(req.user, perms, req.params.id, function (err, model) {
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
                project.updater = req.user;
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
                Project.findByIdWithAccess(req.user, ['admin', 'admincc', 'cc'], req.params.id, function (err, model) {
                    if (err) {
                        res.modal(err);
                    } else if (model) {
                        model.safeSet(req.body);
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
            });
        }
    };

})();