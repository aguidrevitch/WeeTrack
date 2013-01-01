(function () {

    var mongoose = require('mongoose'),
        Transaction = require("../../models/transaction"),
        Task = require("../../models/task"),
        Project = require("../../models/project"),
        User = require("../../models/user"),
        chain = require('chain'),
        _ = require('lodash');

    module.exports = {
        setup: function (app, helper) {

            var createTransaction = function (req, res, data) {
                var transaction = new Transaction(data);
                transaction.save(function (err, result) {
                    if (!err) {
                        User.findOne({
                            _id: req.session.user_id
                        }, function (err, user) {
                            if (!err) {
                                res.json(200, _.extend(transaction.toObject(), { owner: user }));
                            } else {
                                res.json(500, {
                                    error: err.errors
                                });
                            }
                        });
                    } else {
                        res.json(500, {
                            error: err.errors
                        });
                    }
                });
            }

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
                                    var options = {
                                        task: task._id,
                                        creator: req.session.user_id,
                                        type: req.body.type,
                                        subtype: req.body.subtype
                                    };
                                    switch (req.body.subtype) {
                                        case "text" :
                                            options['content'] = req.body.content;
                                            createTransaction(req, res, options);
                                            break;
                                        case "file" :
                                            req.filemanager.move(req.body.filename, req.workspace.subdomain + '/' + task.id,
                                                function (err, urls) {
                                                    if (!err) {
                                                        options = _.extend(options, urls);
                                                        createTransaction(req, res, options);
                                                    } else {
                                                        res.json(500, {
                                                            error: {
                                                                _modal: {
                                                                    message: err.message
                                                                }
                                                            }
                                                        });
                                                    }
                                                }
                                            );
                                            break;
                                        case "assign" :
                                            options['assign'] = req.body.assign;
                                            createTransaction(req, res, options);
                                            break;
                                    }

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