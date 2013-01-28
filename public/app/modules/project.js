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
                if (app.global.workspace.id) {
                    this.render(project_id)
                } else {
                    app.global.workspace.on('sync', _.bind(function () {
                        this.render(project_id);
                    }, this));
                }
            },
            render: function (project_id) {
                app.layout.setViews({
                    "section": new Views.Layout({
                        project_id: project_id,
                        workspace: app.global.workspace,
                        collection: app.global.projects,
                        workspaces: app.global.workspaces
                    })
                }).render();
            }
        });

        Project.Router = new Router();

        // Return the module for AMD compliance.
        return Project;

    });
