define([
    // Application.
    "app",
    "router",
    
    // Views
    "modules/auth/views"
    ],
    
    function(app, router, Views) {
        
        var Auth = app.module();
        
        Auth.Model = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/auth',
            authorize: function (attrs, options) {
                var self = this;
                this.fetch({
                    data: {
                        email: attrs.email, 
                        password: attrs.password
                    },
                    error: function (model, res) {
                        var err = ($.parseJSON(res.responseText)).error;
                        
                        user.set({
                            _id: null
                        });
                        
                        self.trigger('deauthorized');
                        if (options.error)
                            options.error(err);
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
        
        var user = new Auth.Model();
        var Router = router.extend({
            routes: {
                "logout": "logout"
            },
            unauthorized: {
                "login": "login",
                "register": "register"
            },
            login: function () {
                app.useLayout("main").setView(
                    "section", new Views.LoginForm({
                        model: user
                    })).render();
            },
            logout: function () {
                user.deauthorize();
                app.router.navigate('/', true);
            },
            register: function () {
                var user = new Auth.Model();
                app.useLayout("main").setView(
                    "section", new Views.RegisterForm({
                        model: user
                    })).render();
            }
        });
        
        Auth.Router = new Router();
        
        var updateNavigation = function () {
            app.useLayout("main").setView(".user-nav", new Views.Navigation({
                model: user
            })).render();
        }
        
        user.on('authorized', function () {
            updateNavigation();
            app.trigger('user:authorized');
        });
        
        user.on('deauthorized', function () {
            updateNavigation();
            app.trigger('user:deauthorized');
        });
        
        user.on('error', function () {
            updateNavigation();
            app.trigger('user:deauthorized');
        });
        
        app.on('router:unauthorized', function () {
            Backbone.history.loadUrl('/login');
        });
        
        Auth.init = function () {
            user.fetch({
                error: function () {
                    user.trigger('deauthorized');
                },
                success: function () {
                    user.trigger('authorized');
                }
            });
        }
        
        // Return the module for AMD compliance.
        return Auth;
    
    });
