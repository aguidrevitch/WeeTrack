(function () {
    var bcrypt = require('bcrypt');
    var User = require("../../models/user");

    module.exports = {
        setup: function (app) {
            
            /* login */
            app.get('/api/user', function (req, res) {
                User.findOne({
                    email: req.param("email")
                }, null, function (err, user) {
                    if (!err) {
                        if (user) {
                            if (bcrypt.compareSync(req.param("password"), user.password)) {
                                res.json(200, user);
                                return;
                            }
                        }
                        res.json(404, {
                            error : {
                                _modal: {
                                    type: 'User does not exist'
                                }
                            }
                        });
                        
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
            });

            /* register */
            app.post('/api/user', function (req, res) {
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
            
        }
    };
    
})();