define([
    // Application.
    "app",
    "router",

    // Views
    "modules/auth/views"
    ],

    function(app, router, Views) {

        var Auth = app.module();

        Auth.Models = {};

        Auth.Models.User = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/auth',
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

        Auth.Models.Task = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/task'
        });

        Auth.Models.Tasks = Backbone.Collection.extend({
            model: Auth.Models.Task,
            url: '/api/task'
        });

        Auth.Models.Project = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/project'
        });

        Auth.Models.Projects = Backbone.Collection.extend({
            model: Auth.Models.Project,
            url: '/api/project'
        });

        var user = new Auth.Models.User();
        var projects = new Auth.Models.Projects();
        var tasks = new Auth.Models.Tasks();

        var Router = router.extend({
            routes: {
                "logout": "logout"
            },
            unauthorized: {
                "login": "login",
                "register": "register"
            },
            login: function () {
                app.layout.setView(
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
                app.layout.setView(
                    "section", new Views.RegisterForm({
                        model: user
                    })).render();
            }
        });

        Auth.Router = new Router();

        var updateNavigation = function () {
            app.layout.setView("nav", new Views.Navigation({
                model: user
            })).render();
        };

        user.on('authorized', function () {
            projects.fetch().done(function () {
                tasks.fetch().done(function () {
                    updateNavigation();
                    app.trigger('user:authorized');
                });
            });
        });

        user.on('deauthorized', function () {
            tasks.reset();
            projects.reset();
            updateNavigation();
            app.trigger('user:deauthorized');
        });

        user.on('error', function () {
            tasks.reset();
            projects.reset();
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
        };

        Auth.getProjects = function () {
            return projects;
        };

        Auth.getTasks = function () {
            return tasks;
        };

        // Return the module for AMD compliance.
        return Auth;

    });
