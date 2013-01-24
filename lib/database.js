(function () {
    
    var config = require('../config');
    var mongoose = require("mongoose");
    require('./models/user');
    require('./models/workspace');
    require('./models/project');
    require('./models/task');
    require('./models/transaction');

    mongoose.connect(config.mongodb.uri, function(err) {
        if(err) {
            throw err;
        }
    });

    mongoose.connection.on('connected', function () {
        console.log('Successfully Connected To Mongoose!');
        console.log('(' + config.mongodb.uri + ')');
    });

    mongoose.connection.on('error', function (err) {
        console.log(err);
    });

})();