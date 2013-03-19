define([
    // Application.
    "app",
    "router",

    // Views
    "modules/auth/views"
],

    function (app, router, Views) {

        var Auth = app.module();

        var Router = router.extend({
            routes: {
                "logout": "logout"
            },
            unauthorized: {
                "login": "login",
                "register": "register"
            },
            login: function () {
                app.layout.setViews({
                    "section": new Views.LoginForm({
                        model: app.global.user
                    })
                }).render();
            },
            logout: function () {
                app.global.user.deauthorize();
            },
            register: function () {
                app.layout.setViews({
                    "section": new Views.RegisterForm({
                        model: app.global.user
                    })
                }).render();
            }
        });

        Auth.Router = new Router();

        app.on('user:authorized', function (user) {
            app.layout.setViews({
                ".user-nav": new Views.UserNavigation(),
                ".workspace-nav": new Views.WorkspaceNavigation()
            }).render();
        });

        app.on('user:deauthorized', function (user) {
            app.layout.setViews({
                ".user-nav": new Views.UserNavigation()
            }).render();
            var workspacenav = app.layout.getView('.workspace-nav');
            if (workspacenav) workspacenav.remove();
            app.router.navigate('/', {trigger: true});
        });

        app.on('router:unauthorized', function () {
            Backbone.history.loadUrl('login');
        });

        Auth.init = function () {
            app.global.user.authorizeSession();
        };

        // Return the module for AMD compliance.
        return Auth;

    });
