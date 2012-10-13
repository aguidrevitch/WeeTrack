(function () {

    var Workspace = require("../../models/workspace");
    var Project = require("../../models/project");
    
    module.exports = {
        setup: function (app) {

            var getCurrentWorkspace = function (req, res, next) {
                var domain = req.get('Host') || '';
                var subdomain = domain.match(/^([^\.]+)/)[1];
                Workspace.findOne({
                    subdomain: subdomain
                }, null, function (err, workspace) {
                    if (workspace) {
                        req.workspace = workspace;
                        next();
                    } else {
                        res.json(500, {
                            error : {
                                _modal: {
                                    message: 'Unknown workspace'
                                }
                            }
                        });
                    }
                })
            };

            /* list */
            app.get('/api/project', getCurrentWorkspace, function (req, res) {
                return Project.find({
                    workspace: req.workspace._id
                }, null, function (err, projects) {
                    if (!err) {
                        res.json(200, projects);
                    } else {
                        res.json(500, {
                            error : {
                                _modal: {
                                    message: err
                                }
                            }
                        });
                    };
                });
            });

            /* create */
            app.post('/api/project', getCurrentWorkspace, function (req, res) {
                var project = new Project(req.body);
                project.workspace = req.workspace;
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