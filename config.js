var config = {
    development: {
        port: 3006,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack_dev"
        }
    },
    production: {
        port: 3006,
        serveMerged: true,
        mongodb: {
            uri: "mongodb://localhost:27017/weetrack"
        }
    }
};

module.exports = config[process.env.NODE_ENV || "development"];
