(function () {

    var config = require("./config"),
        util = require("util"),
        express = require("express"),
        gzippo = require('gzippo'),
        io = require("socket.io"),
        db = require("./lib/database"),
        RedisStore = require('connect-redis')(express),
        upload = require('jquery-file-upload-middleware'),
        http = require('http'),
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

        // must go before bodyParser
        upload.configure({
            uploadDir: app.locals.config.uploadDir,
            uploadUrl: app.locals.config.uploadUrl,
            imageVersions: {
                thumbnail: {
                    width: 80,
                    height: 80
                }
            }
        });

        app.use('/upload', function (req, res, next) {
            upload.fileHandler()(req, res, next);
        });

        /*
        upload.on('begin', function () {
            console.log('begin', arguments)
        });
        upload.on('end', function () {
            console.log('end', arguments)
        });
        upload.on('abort', function () {
            console.log('abort', arguments)
        });
        */

        app.use(express.bodyParser());
        app.use(gzippo.staticGzip(__dirname + "/public"));
        app.use(gzippo.compress());

        app.use('/api', function (req, res, next) {
            // registration is sitewide
            if (req.url.match(/^\/auth$/) && req.method == 'POST') {
                next();
                return;
            }
            var domain = req.headers.host || '';
            var subdomain = domain.match(/^([^\.]+)/)[1];
            require('./lib/models/workspace').findOne({
                subdomain: subdomain
            }, null, function (err, workspace) {
                if (workspace) {
                    req.workspace = workspace;
                    req.filemanager = upload.fileManager();
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
        controller.setup(app);
    });

    var server = app.listen(config.port);
    var socket = io.listen(server);
    socket.set("log level", 1);

    util.puts("Server started on port " + config.port);

})();