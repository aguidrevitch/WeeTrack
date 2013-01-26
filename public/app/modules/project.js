define([
    // Application.
    "app",
    "router",

    // Views
    "modules/project/views"

],

    function (app, router, Views) {

        var Project = app.module();

        var Router = router.extend({
            authorized: {
                "project": "project",
                "project/": "project",
                "project/:project_id": "project"
            },
            project: function (project_id) {
                var projects = new app.collections.Projects();
                app.layout.setViews({
                    "section": new Views.Layout({
                        project_id: project_id,
                        collection: projects,
                        workspaces: app.global.workspaces
                    })
                }).render();
                projects.fetch();
            }
        });

        Project.Router = new Router();

        // Return the module for AMD compliance.
        return Project;

    });
