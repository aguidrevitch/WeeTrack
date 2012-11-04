(function () {

    var Workspace = require("../../models/workspace");
    var Project = require("../../models/project");

    module.exports = {
        setup: function (app) {

            /* list */
            app.get('/api/project', function (req, res) {
                return Project.find({
                    workspace: req.workspace._id
                }, null, function (err, projects) {
                    if (!err) {
                        res.json(200, projects);
                    } else {
                        res.json(500, {
                            error: {
                                _modal: {
                                    message: err
                                }
                            }
                        });
                    }
                });
            });

            /* create */
            app.post('/api/project', function (req, res) {
                var project = new Project(req.body);
                project.workspace = req.workspace._id;
                project.save(function (err) {
                    if (!err) {
                        res.json(200, project);
                    } else {
                        res.json(500, {
                            error: err.errors
                        });
                    }
                });
            });
        }
    };

})();