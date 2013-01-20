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

        Home.Views.Home = Backbone.Layout.extend({
            template: "home"
        });

        var Router = router.extend({
            routes: {
                "": "index"
            },
            index: function () {
                app.layout.setViews({
                    "section": new Home.Views.Home()
                }).render();
            }
        });

        Home.Router = new Router();

        // Return the module for AMD compliance.
        return Home;

    });
