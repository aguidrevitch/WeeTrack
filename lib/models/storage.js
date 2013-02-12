var uuid = require('node-uuid');
var mkdirp = require('mkdirp');
var fs = require('fs');
var uploadDir = require('../../config').uploadDir;

(function () {

    var Storage = {};

    Storage.getDir = function (id) {
        var dirs = id.match(/^(\w)(\w{4})/);
        return dirs[1] + '/' + dirs[2];
    };

    Storage.save = function (file, callback) {
        var i = 0, signature = "", buffer, type;

        while (file.data[i] != "," && i <= 100) {
            signature += file.data[i];
            i++;
        }
        type = signature.match(/;([^;,]+)$/);
        if (!type || !type[1] || type[1] != 'base64' || i == 101) {
            callback(new Error('Cannot detect file signature'))
        } else {
            try {
                buffer = new Buffer(file.data.substring(i), 'base64');
            } catch (e) {
                callback(e);
            }
            var id = uuid.v4(), targetDir = uploadDir + '/' + this.getDir(id);
            mkdirp(targetDir, function (err) {
                if (err) {
                    callback(err)
                } else {
                    fs.open(targetDir + '/' + id, 'w', function (err, fd) {
                        if (err) {
                            callback(err);
                        } else {
                            fs.write(fd, buffer, 0, buffer.length, null, function (err) {
                                callback(err, id);
                            });
                        }
                    });
                }
            });
        }
    };

    Storage.location = function (id) {
        return uploadDir + '/' + this.getDir(id) + '/' + id;
    };

    module.exports = Storage;

})();