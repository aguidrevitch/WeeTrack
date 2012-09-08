define([
    // Application.
    "app",
    "router",

    // Views
    "modules/user/views"
    ],

    // Map dependencies from above array.
    function(app, router, Views) {

        // Create a new module.
        var User = app.module();

        // Default model.
        User.Model = Backbone.Model.extend({
  
            });

        // Default collection.
        User.Collection = Backbone.Collection.extend({
            model: User.Model
        });

        var Router = Backbone.Router.extend({
            routes: {
                "user/login": "login",
                "user/register": "register"
            },

            login: function () {
                app.useLayout("main").setViews({
                    "section": new Views.LoginForm()
                }).render();
            },
            register: function () {
                app.useLayout("main").setViews({
                    "section": new Views.RegisterForm()
                }).render();
            }
        });

        app.useLayout("main").setViews({
            ".user-nav": new Views.Navigation()
        }).render();

        User.Router = new Router();

        // Return the module for AMD compliance.
        return User;

    });
