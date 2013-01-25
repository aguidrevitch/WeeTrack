define([
    // Application.
    "app",
    "router",

    // Views
    "modules/workspace/views"

],

    function (app, router, Views) {

        var Workspace = app.module();

        var Router = router.extend({
            authorized: {
                "workspace": "workspace",
                "workspace/": "workspace",
                "workspace/:workspace": "workspace"
            },
            workspace: function (workspace_id) {
                app.layout.setViews({
                    "section": new Views.Layout({
                        workspace_id: workspace_id,
                        collection: app.global.workspaces
                    })
                }).render();
            }
        });

        Workspace.Router = new Router();

        // Return the module for AMD compliance.
        return Workspace;

    });
