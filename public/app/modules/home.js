define([
    // Application.
    "app"
    ],

    // Map dependencies from above array.
    function(app) {

        // Create a new module.
        var Home = app.module();
        
        var View = Backbone.View.extend({
            template: "home"
        });

        var Router = Backbone.Router.extend({
            routes: {
                "": "index"
            },

            index: function() {
                app.useLayout("main").setViews({
                    "section": new View({})
                }).render();
            }
        });

        Home.Router = new Router();

        // Return the module for AMD compliance.
        return Home;

    });
