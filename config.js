var config = {
    development: {
        port: 3006,
        hostname: 'tracker.com',
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack_dev"
        },
        redis: {
            db: 1,
            ttl: 86400 * 365
        },
        session: {
            secret: "secret",
            maxAge: 60000 * 60 * 24 * 365
        },
        uploadDir: __dirname + '/storage'
    },
    production: {
        hostname: 'bladetracker.com',
        port: 3006,
        serveMerged: true,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack_dev"
        },
        redis: {
            db: 0,
            ttl: 86400 * 365
        },
        session: {
            secret: "secret",
            maxAge: 60000 * 60 * 24 * 365
        },
        uploadDir: __dirname + '/storage'
    }
};

module.exports = config[process.env.NODE_ENV || "development"];
