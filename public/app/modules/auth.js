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
                app.global.user.deauthorize().done(function () {
                    app.router.navigate('/', { trigger: true });
                });
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
        });

        app.on('router:unauthorized', function () {
            console.log('auth.js router:unathorized');
            if (location.pathname.indexOf('/login') == -1) {
                console.log('auth.js router:unathorized redirected to login');
                Backbone.history.loadUrl('login');
            }
        });

        // Return the module for AMD compliance.
        return Auth;

    });
