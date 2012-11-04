(function () {

    var config = require("./config"),
        util = require("util"),
        express = require("express"),
        io = require("socket.io"),
        db = require("./lib/database"),
        RedisStore = require('connect-redis')(express);

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
        app.use(express.static(__dirname + "/public"));
        app.use('/api/', function (req, res, next) {
                // registration is sitewide
                if (req.url.match(/^\/auth$/) && req.method == 'POST') {
                    next();
                    return;
                }
                var domain = req.get('Host') || '';
                var subdomain = domain.match(/^([^\.]+)/)[1];
                require('./lib/models/workspace').findOne({
                    subdomain: subdomain
                }, null, function (err, workspace) {
                    if (workspace) {
                        req.workspace = workspace;
                        next();
                    } else {
                        res.json(500, {
                            error: {
                                _modal: {
                                    message: 'Unknown workspace'
                                }
                            }
                        });
                    }
                });
            }
        );
        app.use(app.router);
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack: true
        }));
    });

    var controllers = require("./controllers-config");
    controllers.map(function (name) {
        controller = require("./lib/controllers/" + name);
        controller.setup(app);
    });

    var server = app.listen(config.port);
    var socket = io.listen(server);
    socket.set("log level", 1);

    util.puts("Server started on port " + config.port);

})();