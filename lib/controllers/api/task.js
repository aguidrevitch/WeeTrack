(function () {

    var Workspace = require("../../models/workspace");
    var Project = require("../../models/project");
    var Task = require("../../models/task");
    var _ = require('lodash');

    module.exports = {
        setup: function (app) {

            var getCurrentWorkspace = function (req, res, next) {
                var domain = req.get('Host') || '';
                var subdomain = domain.match(/^([^\.]+)/)[1];
                Workspace.findOne({
                    subdomain: subdomain
                }, null, function (err, workspace) {
                    if (workspace) {
                        req.workspace = workspace;
                        next();
                    } else {
                        res.json(500, {
                            error: {
                                _modal: {
                                    message: 'Unknown workspace'
                                }
                            }
                        });
                    }
                })
            };

            /* list */
            app.get('/api/task', getCurrentWorkspace, function (req, res) {
                Project.find({
                    workspace: req.workspace._id
                }, null, function (err, projects) {
                    if (!err) {
                        var plist = _.pluck(projects, '_id');
                        Task.find({
                            project: {
                                $in: plist
                            }
                        }, null, function (err, tasks) {
                            if (!err) {
                                res.json(200, tasks);
                            } else {
                                res.json(500, {
                                    error: {
                                        _modal: {
                                            message: err
                                        }
                                    }
                                });
                            }
                        })
                    } else {
                        res.json(500, {
                            error: {
                                _modal: {
                                    message: err
                                }
                            }
                        });
                    }
                });
            });

            /* single */
            app.get('/api/task/:id', getCurrentWorkspace, function (req, res) {
                Project.find({
                    workspace: req.workspace._id
                }, null, function (err, projects) {
                    if (!err) {
                        var plist = _.pluck(projects, '_id');
                        Task.findOne({
                            id: req.params.id,
                            project: {
                                $in: plist
                            }
                        }, null, function (err, task) {
                            if (!err) {
                                if (task) {
                                    res.json(200, task);
                                } else {
                                    res.json(404, {
                                        error: {
                                            _modal: {
                                                message: 'Task not found'
                                            }
                                        }
                                    });
                                }
                            } else {
                                res.json(500, {
                                    error: {
                                        _modal: {
                                            message: err
                                        }
                                    }
                                });
                            }
                        })
                    } else {
                        res.json(500, {
                            error: {
                                _modal: {
                                    message: err
                                }
                            }
                        });
                    }
                });
            });

            /* create */
            app.post('/api/task', getCurrentWorkspace, function (req, res) {
                var task = new Task(req.body);
                task.workspace = req.workspace._id;
                task.save(function (err) {
                    if (!err) {
                        res.json(200, task);
                    } else {
                        res.json(500, {
                            error: err.errors
                        });
                    }
                });
            });
        }
    };

})();