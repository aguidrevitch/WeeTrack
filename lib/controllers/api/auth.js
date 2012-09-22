(function () {
    var bcrypt = require('bcrypt');
    var User = require("../../models/user");
    var Workspace = require("../../models/workspace");
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
                            error : {
                                _modal: {
                                    message: 'Unknown workspace'
                                }
                            }
                        });
                    }
                })
            };
            /* login */
            app.get('/api/auth', getCurrentWorkspace, function (req, res) {
                var authorize = function () {
                    User.findOne({
                        email: req.param("email"),
                        confirmed: true
                    }, null, function (err, user) {
                        if (!err) {
                            var users = _.union(req.workspace.owners, req.workspace.admins, req.workspace.guests);
                            //console.log(users, user._id, _.filter(users, function (u) { return user._id.toString() == u.toString() }));
                            if (user && _.filter(users, function (u) { return user._id.toString() == u.toString() }).length === 0) {
                                res.json(404, {
                                    error : {
                                        _modal: {
                                            message: 'Not allowed for ' + req.workspace.name
                                        }
                                    }
                                });
                            } else if (user && user.confirmed) {
                                bcrypt.compare(req.param("password"), user.password, function (err, matches) {
                                    if (matches) {
                                        req.session.user_id =  user.get('_id');
                                        if (!req.param("remember_me") || req.param("remember_me") == "false")
                                            req.session.cookie.expires = false;
                                        res.json(200, user);
                                    } else {
                                        res.json(404, {
                                            error : {
                                                _modal: {
                                                    message: 'User does not exist'
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
                        if (user && user.confirmed)
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
                var workspace = new Workspace({
                    name: req.body.workspace_name,
                    subdomain: req.body.workspace_subdomain
                });
                user.validate(function (uerr) {
                    workspace.validate(function (werr) {
                        
                        if (uerr || werr) {
                            if (werr) {
                                werr.errors.workspace_name = werr.errors.name;
                                werr.errors.workspace_subdomain = werr.errors.subdomain;
                                delete(werr.errors.name);
                                delete(werr.errors.subdomain);
                            }
                            res.json(500, {
                                error: _.extend((uerr || {}).errors || {}, (werr || {}).errors || {})
                            });
                            return;
                        }
                        
                        bcrypt.hash(user.password, 8, function (err, hash) {
                            user.password = hash;
                            user.save(function (uerr) {
                                if (!uerr) {
                                    workspace.owners.push(user._id);
                                    workspace.save(function (werr) {
                                        if (!werr) {
                                            res.json(200, user);
                                        } else {
                                            // removing user if workspace failed to create
                                            user.remove();
                                            
                                            werr.errors.workspace_name = werr.errors.name;
                                            werr.errors.workspace_subdomain = werr.errors.subdomain;
                                            delete(werr.errors.name);
                                            delete(werr.errors.subdomain);
                                            res.json(500, {
                                                error: werr.errors
                                            });
                                        }
                                    });
                                } else {
                                    res.json(500, {
                                        error: uerr.errors
                                    });
                                }
                            });
                        });
                    });
                });
            });
            
            app.delete('/api/auth', function (req, res) {
                req.session.user_id = null;
                res.json({
                    _id: null
                });
            });
        }
    };

})();