(function () {

    var mongoose = require('mongoose'),
        Transaction = require("../../models/transaction"),
        Task = require("../../models/task"),
        Project = require("../../models/project"),
        chain = require('chain'),
        _ = require('lodash');

    module.exports = {
        setup: function (app, helper) {

            /* create */
            app.post('/api/transaction', function (req, res) {
                Project.find({
                    workspace: req.workspace._id
                }, null, function (err, projects) {
                    if (!err) {
                        var plist = _.pluck(projects, '_id');
                        Task.findOne({
                            id: req.body.task,
                            project: {
                                $in: plist
                            }
                        }, null, function (err, task) {
                            if (!err) {
                                if (task) {
                                    var transaction = new Transaction({
                                        owner: req.session.user_id,
                                        content: req.body.content,
                                        task: task._id
                                    });
                                    transaction.save(function (err, result) {
                                        if (!err) {
                                            res.json(200, transaction);
                                        } else {
                                            res.json(500, {
                                                error: err.errors
                                            });
                                        }
                                    });
                                } else {
                                    res.json(500, {
                                        error: {
                                            _modal: {
                                                message: 'Task not found'
                                            }
                                        }
                                    });
                                }
                            } else {
                                res.json(500, {
                                    error: err.errors
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
        }
    }
})();