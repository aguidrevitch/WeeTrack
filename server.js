(function () {

    var config = require("./config"),
        util = require("util"),
        express = require("express"),
        gzippo = require('gzippo'),
        db = require("./lib/database"),
        User = require("./lib/models/user"),
        Workspace = require("./lib/models/workspace"),
        RedisStore = require('connect-redis')(express),
        _ = require('lodash');

    var app = express();

    app.configure(function () {
        app.locals({
            "config": config,
            "env": process.env
        });
        app.use(express.cookieParser());
        app.use(express.methodOverride());
        app.use(express.session({
            secret: config.session.secret,
            cookie: {
                domain: '.' + config.hostname,
                maxAge: config.session.maxAge
            },
            store: new RedisStore(config.redis)
        }));
        app.set("views", __dirname + "/views");
        app.set("view engine", "jade");
        app.set("view options", {
            layout: false,
            pretty: true
        });

        app.use(express.bodyParser());

        if (process.env.NODE_ENV != 'production') {
            app.use(gzippo.staticGzip(__dirname + "/public"));
            app.use(gzippo.compress());
        }

        /* modal */
        app.use(function (req, res, next) {
            res.modal = function (code, err) {
                if (arguments.length == 1) {
                    err = code;
                    code = 500;
                }

                res.json(code, {
                    error: {
                        _modal: {
                            message: err
                        }
                    }
                });
            };
            res.error = function (err) {
                if (err instanceof Error) {
                    if (err.errors) {
                        res.json(500, {
                            error: err.errors
                        });
                    } else {
                        res.modal(err.message);
                    }
                } else {
                    throw new Error('Unknown error class');
                }
            };
            next();
        });

        /* user */
        app.use('/api', function (req, res, next) {
            if (req.session.user_id) {
                User.findOne({
                    _id: req.session.user_id
                }, function (err, user) {
                    if (user)
                        req.user = user;
                    next();
                })
            } else {
                next();
            }
        });

        app.use(app.router);
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack: true
        }));
    });

    var controllers = require("./controllers-config");
    controllers.map(function (name) {
        controller = require("./lib/controllers/" + name);
        controller.setup(app, function (req, res, next) {
            if (req.session.user_id) {
                next();
            } else {
                // denying access
                res.error(new Error('Access Denied'));
                return;
            }
        });
    });

    var server = app.listen(config.port);
    util.puts("Server started on port " + config.port);

})();