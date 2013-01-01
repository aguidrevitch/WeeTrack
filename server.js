(function () {

    var config = require("./config"),
        util = require("util"),
        express = require("express"),
        gzippo = require('gzippo'),
        io = require("socket.io"),
        db = require("./lib/database"),
        User = require("./lib/models/user"),
        Workspace = require("./lib/models/workspace"),
        RedisStore = require('connect-redis')(express),
        upload = require('jquery-file-upload-middleware'),
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
            uploadDir: app.locals.config.uploadDir + '/.tmp',
            uploadUrl: app.locals.config.uploadUrl + '/.tmp',
            targetDir: app.locals.config.uploadDir,
            targetUrl: app.locals.config.uploadUrl,
            imageVersions: {
                thumbnail: {
                    width: 80,
                    height: 80
                }
            }
        });

        app.use('/upload', upload.fileHandler());

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

        /* modal */
        app.use(function (req, res, next) {
            res.modal = function (code, message) {
                if (arguments.length == 1) {
                    message = code;
                    code = 500;
                }
                res.json(code, {
                    error: {
                        _modal: message
                    }
                });
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

        /* domain */
        app.use('/api', function (req, res, next) {
            var domain = req.get('Host') || '';
            if (domain) {
                var re = new RegExp("^(.*)\." + config.hostname, "i");
                var subdomain = (domain.match(re) || [])[1];
                if (subdomain) {
                    Workspace.findOne({
                        subdomain: subdomain
                    }, function (err, workspace) {
                        if (workspace)
                            req.workspace = workspace;
                        next();
                    });
                } else {
                    next();
                }
            } else {
                next();
            }
        });

        /* upload file manager */
        app.use('/api', function (req, res, next) {
            req.filemanager = upload.fileManager();
            next();
        });

        /* main handler */
        app.use('/api', function (req, res, next) {
            // registration is sitewide
            if (req.url.match(/^\/auth/) || req.url.match(/^\/user/) || req.url.match(/^\/workspace/)) {
                next();
                return;
            }

            if (!req.workspace)
                res.modal('Unknown workspace');
            else
                next();
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