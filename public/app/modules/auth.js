define([
    // Application.
    "app",
    "router",

    // Views
    "modules/auth/views"
],

    function (app, router, Views) {

        var Auth = app.module();

        Auth.Models = {};

        Auth.Models.User = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/auth',
            authorizeSession: function () {
                var self = this;
                this.fetch({
                    error: function () {
                        self.trigger('deauthorized');
                    },
                    success: function () {
                        self.trigger('authorized');
                    }
                });
            },
            authorize: function (attrs, options) {
                var self = this;
                this.fetch({
                    data: {
                        email: attrs.email,
                        password: attrs.password,
                        remember_me: attrs.remember_me
                    },
                    error: function (model, res) {
                        var error = ($.parseJSON(res.responseText)).error;

                        user.set({
                            _id: null
                        });

                        self.trigger('deauthorized');
                        if (options.error)
                            options.error(error);
                    },
                    success: function (model, res) {
                        self.trigger('authorized');
                        if (options.success)
                            options.success(model, res);
                    }
                });
            },
            deauthorize: function () {
                var self = this;
                self.destroy({
                    success: function () {
                        user.set({
                            _id: null
                        });
                        self.trigger('deauthorized');
                    }
                });
            }
        });

        var user = new Auth.Models.User();

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
                        model: user
                    })
                }).render();
            },
            logout: function () {
                user.deauthorize();
                app.router.navigate('/', true);
            },
            register: function () {
                var user = new Auth.Models.User();
                app.layout.setViews({
                    "section": new Views.RegisterForm({
                        model: user
                    })
                }).render();
            }
        });

        Auth.Router = new Router();

        user.on('authorized', function () {
            app.layout.setViews({
                "nav.top": new Views.TopNavigation({ model: user })
            });
            app.layout.getView('nav.top').render();
            app.trigger('user:authorized', user);
        });

        user.on('deauthorized', function () {
            app.layout.setViews({
                "nav.top": new Views.TopNavigation({ model: user })
            });
            app.layout.getView('nav.top').render();
            app.trigger('user:deauthorized', user);
        });

        app.on('router:unauthorized', function () {
            Backbone.history.loadUrl('login');
        });

        Auth.init = function () {
            user.authorizeSession();
        };

        // Return the module for AMD compliance.
        return Auth;

    });
