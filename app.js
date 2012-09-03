(function () {

    var util = require("util");

    process.on('uncaughtException',
    function(err) {
        util.puts("Uncaught exception.");
        util.puts(err);
        util.puts(err.stack);
    });

    var io = require('socket.io'),
        express = require('express'),
        config = require("./config"),
        mergeStatic = require("./merge-static");

    var app = express();

    app.configure(function() {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.set('view options', {
            layout: false,
            pretty: true
        });
        app.use(express.bodyParser());
        app.use(express.cookieParser());
        app.use(express.methodOverride());
        app.use(app.router);
        app.use(express.static(__dirname + '/static'));
    });

    app.get('/', function (res, req) {
    
    });

    app.get('/user/login', function (res, req) {
    
    });

    if (!config.serveMerged) {
        mergeStatic = function(callback) {
            callback("", "");
        };
    }

    mergeStatic(function(jsHash, cssHash) {

        app.set({
            jsHash: jsHash,
            cssHash: cssHash
        });

        util.puts("Registering app routes");
        // registerAppRoutes(app);
        util.puts("Registering Socket.IO");
        // registerSocketIO(app);

        app.listen(config.port);

        var server = app.listen(config.port);
        var socket = io.listen(server);
        socket.set('log level', 1);

        util.puts("Server started on port " + config.port);

    });

})();