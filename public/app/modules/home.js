define([
    // Application.
    "app",
    "router",

    // Views
    "modules/home/views"

],

    function (app, router, Views) {

        var Home = app.module();

        var Router = router.extend({
            authorized: {
                "": "home"
            },
            initialize: function (options) {
                this.route(/^(add)$/, "task", this.home);
                this.route(/^(\d+)/, "task", this.home);
            },
            home: function (task_id) {
                app.layout.setViews({
                    "section": new Views.Layout({
                        workspaces: app.global.workspaces,
                        projects: app.global.projects,
                        collection: app.global.tasks,
                        task_id: task_id
                    })
                }).render();
            }
        });

        Home.Router = new Router();

        // Return the module for AMD compliance.
        return Home;

    });
