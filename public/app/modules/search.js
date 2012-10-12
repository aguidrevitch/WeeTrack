define([
    // Application.
    "app",
    "router",
    
    // Views
    "modules/search/views"
    ],
    
    function(app, router, Views) {
        
        var Search = app.module();
        
        Search.Model = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/task'
        });

        Search.Collection = Backbone.Collection.extend({
            model: Search.Model,
            url: '/api/task/search'
        });

        Search.Project = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/project'
        });

        Search.Projects = Backbone.Collection.extend({
            model: Search.Model,
            url: '/api/project'
        });

        var projects = new Search.Projects();
        var tasks = new Search.Collection();
        
        var Router = router.extend({
            authorized: {
                "search": "search"
            },
            search: function () {
                app.layout.setViews({
                    "section": new Views.Layout({
                        views: {
                            "#tasks" : new Views.Tasks({
                                collection: tasks
                            }),
                            "#projects" : new Views.Projects({
                                collection: projects
                            })
                        }
                    })
                }).render();

                projects.fetch();
                tasks.fetch();
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
