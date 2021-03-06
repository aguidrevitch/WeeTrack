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
            routes: {
                "": "home"
            },
            initialize: function (options) {
                this.route(/^(add)$/, "task", this.home);
                this.route(/^(\d+)/, "task", this.home);
            },
            home: function (task_id) {
                if (app.global.user.id) {
                    if (!app.global.workspace.id) {
                        if (app.global.workspaces.length) {
                            app.router.navigate('/workspace/switch', { trigger: true });
                        } else {
                            app.router.navigate('/workspace/add', { trigger: true });
                        }
                    } else {
                        app.layout.setViews({
                            "section": new Views.Layout({
                                task_id: task_id
                            })
                        }).render();
                    }
                } else {
                    Backbone.history.loadUrl('login');
                }
            }
        });

        Home.Router = new Router();

        // Return the module for AMD compliance.
        return Home;

    });
