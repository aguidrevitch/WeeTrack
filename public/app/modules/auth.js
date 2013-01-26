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
                app.router.navigate('/', true);
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
            //console.log('user:authorized', user.id);
            app.layout.setViews({
                ".user-nav": new Views.TopNavigation({
                    model: user
                })
            });
            app.layout.getView('.user-nav').render();
        });

        app.on('user:deauthorized', function (user) {
            console.log('user:deauthorized', user.id);
            app.layout.setViews({
                ".user-nav": new Views.TopNavigation({
                    model: user
                })
            });
            app.layout.getView('.user-nav').render();
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
