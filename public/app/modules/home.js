define([
    // Application.
    "app",
    // Router
    "router"
],

    // Map dependencies from above array.
    function (app, router) {

        // Create a new module.
        var Home = app.module();

        Home.Views.Home = Backbone.View.extend({
            template: "home"
        });

        var Router = router.extend({
            routes: {
                "": "index"
            },
            index: function () {
                app.layout.setView(
                    "section", new Home.Views.Home({})
                ).render();
            }
        });

        Home.Router = new Router();

        // Return the module for AMD compliance.
        return Home;

    });
