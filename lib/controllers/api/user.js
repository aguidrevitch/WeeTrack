(function () {

    var User = require("../../models/user");

    module.exports = {
        setup: function (app) {
            
            app.post('/api/user', function (req, res) {
                var user = new User(req.body);
                user.save(function (err) {
                    if (!err) {
                        res.send(200, user);
                    } else {
                        res.send(403, {
                            error: err.errors
                        });
                    }
                });
            });
            
            app.post('/api/user/login', function (req, res) {
                var user = new User(req.body);
                user.save(function (err) {
                    if (!err) {
                        res.json(200, user);
                    } else {
                        res.json(403, {
                            error: err.errors
                        });
                    }
                });
            });
            
        }
    };
    
})();