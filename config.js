var config = {
    development: {
        port: 3006,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack_dev"
        },
        secret: "secret"
    },
    production: {
        port: 3006,
        serveMerged: true,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack"
        },
        secret: "secret"
    }
};

module.exports = config[process.env.NODE_ENV || "development"];
