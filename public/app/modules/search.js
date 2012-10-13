define([
    // Application.
    "app",
    "router",

    // Views
    "modules/search/views"
    ],

    function(app, router, Views) {

        var Search = app.module();

        Search.Task = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/task'
        });

        Search.Tasks = Backbone.Collection.extend({
            model: Search.Task,
            url: '/api/task/search'
        });

        Search.Project = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/project'
        });

        Search.Projects = Backbone.Collection.extend({
            model: Search.Project,
            url: '/api/project'
        });

        var projects = new Search.Projects();
        var tasks = new Search.Tasks();

        var Router = router.extend({
            authorized: {
                "search": "search"
            },
            search: function () {
                app.layout.setViews({
                    "section": new Views.Layout({
                        views: {
                            "#left-sidebar" : new Views.Projects({
                                collection: projects
                            }),
                            "#right-sidebar" : new Views.Tasks({
                                collection: tasks
                            })
                        }
                    })
                }).render().done(function () {
                    projects.fetch();
                    tasks.fetch();
                });
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
