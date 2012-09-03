var config = {
    development: {
        port: 8000,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack_dev"
        },
    },
    productiont: {
        port: 8000,
        serveMerged: true,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack"
        },
    }
};

module.exports = config[process.env.NODE_ENV || "development"];

require('./static-config')(module.exports);
