(function () {

    var mongoose = require('mongoose');
    var Workspace = require("../../models/workspace");
    var Project = require("../../models/project");
    var Task = require("../../models/task");
    var Transaction = require("../../models/transaction");
    var chain = require('chain');
    var _ = require('lodash');

    module.exports = {
        setup: function (app, helper) {

            /* list */
            app.get('/api/task', function (req, res) {
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
            app.get('/api/task/:id', function (req, res) {
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
                        })
                            .populate('project')
                            .exec(function (err, task) {
                                if (!err) {
                                    if (task) {
                                        Transaction.find({
                                            task: task._id
                                        })
                                            .populate('owner')
                                            .exec(function (err, transactions) {
                                                if (err) {
                                                    res.json(500, {
                                                        error: err.errors
                                                    });
                                                } else {
                                                    res.json(200, _.extend(task.toObject(), {
                                                        transactions: transactions || []
                                                    }));
                                                }
                                            })
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
            app.post('/api/task', function (req, res) {
                var task = new Task(_.extend({}, req.body, {
                    workspace: req.workspace._id
                }, req.body));

                var transaction = new Transaction({
                    owner: req.session.user_id,
                    content: req.body.content,
                    task: task._id
                });

                chain.parallel({
                    ta: _.bind(task.validate, task),
                    tr: _.bind(transaction.validate, transaction)
                }, function (err, result) {
                    if (err.ta || err.tr) {
                        res.json(500, {
                            error: _.extend((err.ta || {}).errors || {}, (err.tr || {}).errors || {})
                        });
                    } else {
                        chain.series([
                            _.bind(task.save, task),
                            _.bind(transaction.save, transaction),
                        ], function (errors, results) {
                            var err = {
                                ta: errors[0],
                                tr: errors[1]
                            };
                            if (err.ta || err.tr) {
                                res.json(500, {
                                    error: _.extend((err.ta || {}).errors || {}, (err.tr || {}).errors || {})
                                });
                            } else {
                                res.json(200, task);
                            }
                        });
                    }
                });
            });
        }
    }
})();