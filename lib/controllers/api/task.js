(function () {

    var _ = require('lodash'),
        mongoose = require("mongoose"),
        ObjectId = mongoose.Types.ObjectId;

    module.exports = {
        setup: function (app, authorizedOnly) {

            /* list */
            app.get('/api/task/:workspace', authorizedOnly, function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'],
                    condition = {};

                try {
                    ObjectId.fromString(req.params.workspace);
                } catch (e) {
                    res.error(new Error('Wrong workspace'));
                    return;
                }

                if (req.query.project) {
                    try {
                        ObjectId.fromString(req.query.project);
                        condition.path = new RegExp("^" + req.params.workspace + "_" + req.query.project)
                    } catch (e) {
                        res.error(new Error('Wrong project'));
                        return;
                    }
                } else {
                    condition.path = new RegExp("^" + req.params.workspace);
                }

                if (req.query.status) {
                    condition.status = { $in: req.query.status.split(',') };
                } else {
                    condition.status = { $in: ['new', 'open']};
                }

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                if (req.query.owner) {
                    //condition = { $and: [ {path: condition.path} ] };
                    mongoose.model('User').findByIdOrEmail(req.query.owner, function (err, user) {
                        if (err) {
                            res.error(err);
                        } else if (user) {
                            mongoose.model('Task').findWithAccess(user, ['owner'], condition, null, { sort: {'priority': -1}}, function (err, models) {
                                if (err) {
                                    res.error(err);
                                } else {
                                    res.json(models);
                                }
                            });
                        } else {
                            res.error(new Error('User not found'));
                        }
                    });
                } else {
                    mongoose.model('Task').findWithAccess(req.user, perms, condition, null, { sort: {'priority': -1}}, function (err, models) {
                        if (err) {
                            res.error(err);
                        } else {
                            res.json(models);
                        }
                    });
                }
            });

            /* get */
            app.get('/api/task/:workspace/:id', authorizedOnly, function (req, res) {
                var perms = ['admin', 'admincc', 'cc', 'owner'], condition = { id: req.params.id };

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('No workspace'));
                    return;
                }

                if (req.query.perm)
                    perms = req.query.perm.split(/\s*,\s*/);

                mongoose.model('Task').findOneWithAccess(req.user, perms, condition, function (err, model) {
                    if (err) {
                        res.error(err);
                    } else if (!model) {
                        res.json(model);
                    } else {
                        model.updater = req.user;
                        model.transactions(function (err, transactions) {
                            if (err) {
                                res.error(err);
                            } else {
                                res.json(_.extend(model, {
                                    transactions: transactions
                                }));
                            }
                        });
                    }
                });
            });

            /* create */
            app.post('/api/task/:workspace', authorizedOnly, function (req, res) {
                var Task = mongoose.model('Task');
                var task = new Task(_.extend({}, req.body, {
                    creator: req.user,
                    updater: req.user
                }));

                if (req.query.validate) {
                    task.validate(function (err) {
                        if (err) {
                            res.error(err);
                        } else {
                            res.json(task);
                        }
                    });
                } else {
                    task.save(function (err) {
                        if (err) {
                            res.error(err);
                        } else {
                            task.transactions(function (err, transactions) {
                                if (err) {
                                    res.error(err);
                                } else {
                                    res.json(_.extend(task, {
                                        transactions: transactions
                                    }));
                                }
                            });
                        }
                    });
                }
            });
        }
    }
})();