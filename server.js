(function () {

    var config = require("./config"),
    util = require("util"),
    express = require("express"),
    io = require("socket.io"),
    db = require("./lib/database"),
    RedisStore = require('connect-redis')(express);

    var app = express();

    app.configure(function() {
        app.locals({
            "config": config,
            "env": process.env
        });
        app.use(express.cookieParser());
        app.use(express.methodOverride());
        app.use(express.session({
            secret: config.secret,
            store: new RedisStore()
        }));
        app.set("views", __dirname + "/views");
        app.set("view engine", "jade");
        app.set("view options", {
            layout: false,
            pretty: true
        });
        app.use(express.bodyParser());
        app.use(express.static(__dirname + "/public"));
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