(function () {
    var bcrypt = require('bcrypt');
    var User = require("../../models/user");
    
    module.exports = {
        setup: function (app) {
            
            /* login */
            app.get('/api/auth', function (req, res) {
                var authorize = function () {
                    User.findOne({
                        email: req.param("email"),
                        confirmed: true
                    }, null, function (err, user) {
                        if (!err) {
                            if (user && user.confirmed) {
                                if (bcrypt.compareSync(req.param("password"), user.password)) {
                                    req.session.user_id =  user.get('_id');
                                    if (!req.param("remember_me") || req.param("remember_me") == "false")
                                        req.session.cookie.expires = false;
                                    res.json(200, user);
                                }
                            } else {
                                res.json(404, {
                                    error : {
                                        _modal: {
                                            type: 'User does not exist'
                                        }
                                    }
                                });
                            }
                        } else {
                            res.json(500, {
                                error : {
                                    _modal: {
                                        type: err
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
                user.save(function (err) {
                    if (!err) {
                        res.json(200, user);
                    } else {
                        res.json(500, {
                            error: err.errors
                        });
                    }
                });
            });
        
            app.delete('/api/auth', function (req, res) {
                req.session.user_id = null;
                res.json({
                    _id: null
                });
            //res.json(true);
            });
        }
    };

})();