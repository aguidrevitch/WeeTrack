(function () {

    var bcrypt = require('bcrypt');
    var User = require("../../models/user");

    module.exports = {
        setup: function (app) {

            /* login */
            app.get('/api/auth', function (req, res) {
                if (req.user) {
                    res.json(req.user);
                } else {
                    User.authorize(req.param('email'), req.param('password'), function (err, user) {
                        if (err) {
                            res.modal(err);
                            return;
                        }

                        if (user) {
                            req.session.user_id = user.get('_id');
                            if (!req.param("remember_me") || req.param("remember_me") == "false")
                                req.session.cookie.expires = false;
                            res.json(user);
                        } else {
                            res.modal(403, 'Authorization failed');
                        }
                    });
                }
            });

            /* register */
            app.post('/api/auth', function (req, res) {
                var user = new User(req.body);
                user.save(function (err) {
                    if (err) {
                        res.json(500, {
                            error: err.errors
                        });
                    } else {
                        req.session.user_id =  user.get('_id');
                        req.session.cookie.expires = false;
                        res.json(user);
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