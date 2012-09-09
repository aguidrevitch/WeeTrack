define([
    // Application.
    "app",
    "router",

    // Views
    "modules/user/views"
    ],

    function(app, router, Views) {

        var User = app.module();

        User.Model = Backbone.Model.extend({
            url: '/api/user'
        });

        User.Collection = Backbone.Collection.extend({
            model: User.Model
        });

        var Router = Backbone.Router.extend({
            routes: {
                "user/login": "login",
                "user/register": "register"
            },

            login: function () {
                var user = new User.Model();
                app.useLayout("main").setViews({
                    "section": new Views.LoginForm({
                        model: user
                    })
                }).render();
            },
            register: function () {
                var user = new User.Model();
                app.useLayout("main").setViews({
                    "section": new Views.RegisterForm({
                        model: user
                    })
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
