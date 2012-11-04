(function () {
    var bcrypt = require('bcrypt');
    var User = require("../../models/user");
    var Workspace = require("../../models/workspace");
    var _ = require('lodash');
    var chain = require('chain');
    var async = require('async');

    module.exports = {
        setup: function (app) {

            /* login */
            app.get('/api/auth', function (req, res) {
                var authorize = function () {
                    User.findOne({
                        email: req.param("email")
                    }, null, function (err, user) {
                        if (!err) {
                            var users = _.union(req.workspace.owners, req.workspace.admins, req.workspace.readers);
                            if (user && _.filter(users, function (u) {
                                return user._id.toString() == u.toString()
                            }).length === 0) {
                                res.json(403, {
                                    error : {
                                        _modal: {
                                            message: 'Not allowed for ' + req.workspace.name
                                        }
                                    }
                                });
                            } else if (user) {
                                bcrypt.compare(req.param("password"), user.password, function (err, matches) {
                                    if (matches) {
                                        req.session.user_id =  user.get('_id');
                                        if (!req.param("remember_me") || req.param("remember_me") == "false")
                                            req.session.cookie.expires = false;
                                        res.json(200, user);
                                    } else {
                                        res.json(403, {
                                            error : {
                                                _modal: {
                                                    message: 'Wrong username or password'
                                                }
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.json(404, {
                                    error : {
                                        _modal: {
                                            message: 'User does not exist'
                                        }
                                    }
                                });
                            }
                        } else {
                            res.json(500, {
                                error : {
                                    _modal: {
                                        message: err
                                    }
                                }
                            });
                        }
                    });
                };

                if (req.session.user_id) {
                    User.findOne({
                        _id: req.session.user_id
                    }, null, function (err, user) {
                        if (user)
                            res.json(200, user);
                        else
                            authorize();
                    });
                } else {
                    authorize();
                }
            });

            /* register */
            app.post('/api/auth', function (req, res) {
                var user = new User(req.body);
                //user.setPassword(req.body.password, req.body.verifyPassword);

                var workspace = new Workspace({
                    name: req.body.workspace_name,
                    subdomain: req.body.workspace_subdomain
                });

                var rename_workspace_errors = function (err) {
                    if (!err) return;
                    if (err.errors.name)
                        err.errors.workspace_name = err.errors.name;
                    if (err.errors.subdomain)
                        err.errors.workspace_subdomain = err.errors.subdomain;
                    delete(err.errors.name);
                    delete(err.errors.subdomain);
                    return err;
                };

                chain.parallel({
                    u: _.bind(user.validate, user),
                    w: _.bind(workspace.validate, workspace)
                }, function (err, result) {
                    if (err.u || err.w) {
                        err.w = rename_workspace_errors(err.w);
                        res.json(500, {
                            error: _.extend((err.u || {}).errors || {}, (err.w || {}).errors || {})
                        });
                        return;
                    } else {
                        // validation passed
                        chain.series([
                            _.bind(user.save, user),
                            _.bind(workspace.save, workspace),
                            function (callback) {
                                workspace.owners.push(user._id);
                                callback(null);
                            },
                            _.bind(workspace.save, workspace)
                            ],
                            function (errors, results) {
                                var err = {
                                    u : errors[0],
                                    w: errors[1],
                                    o: errors[3]
                                };
                                if (err.u || err.w || err.o) {
                                    if (err.o) {
                                        workspace.remove();
                                        user.remove();
                                    } else if (err.w) {
                                        user.remove();
                                    }
                                    err.w = rename_workspace_errors(err.w);
                                    err.o = rename_workspace_errors(err.o);
                                    res.json(500, {
                                        error: _.extend((err.u || {}).errors || {}, (err.w || {}).errors || {}, (err.o || {}).errors || {})
                                    });
                                    return;
                                } else {
                                    res.json(200, user);
                                }
                            });
                    }
                });

            });

            /* logout */
            app.delete('/api/auth', function (req, res) {
                req.session.user_id = null;
                res.json({
                    _id: null
                });
            });
        }
    };

})();