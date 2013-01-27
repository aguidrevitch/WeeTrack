(function () {

    var Task = require("../../models/task");
    var ObjectId = require('mongoose').Types.ObjectId;;

    module.exports = {
        setup: function (app, helper) {

            /* list */
            app.get('/api/task', function (req, res) {
                var perm = 'admin';
                if (req.query.perm)
                    perm = req.query.perm;

                var options = {};
                if (req.query.workspace)
                    options.workspace = new ObjectId(req.query.workspace);

                return Task.findWithAccess(req.user, perm, options, function (err, models) {
                    if (err) {
                        res.modal(err);
                    } else {
                        res.json(models);
                    }
                });
            });

            /* get */
            app.get('/api/task/:id', function (req, res) {
                var perm = 'admin';
                if (req.params.query)
                    perm = req.params.query;
                return Task.findOneWithAccess(req.user, perm, { id: req.params.id }, function (err, model) {
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
                Task.findByIdWithAccess(req.user, 'admin', req.params.id, function (err, model) {
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
    }

})();