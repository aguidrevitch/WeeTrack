var config = {
    development: {
        port: 3006,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack_dev"
        },
        redis: {
            db: 1,
            ttl: 86400 * 365
        },
        secret: "secret"
    },
    production: {
        port: 3006,
        serveMerged: true,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack"
        },
        redis: {
            db: 0,
            ttl: 86400 * 365
        },
        secret: "secret"
    }
};

module.exports = config[process.env.NODE_ENV || "development"];
