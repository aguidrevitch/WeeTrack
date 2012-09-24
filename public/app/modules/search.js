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
            url: '/api/tasks'
        });

        Search.Collection = Backbone.Collection.extend({
            model: Search.Model,
            url: '/api/tasks/search'
        });

        var tickets = new Search.Collection();
        
        var Router = router.extend({
            authorized: {
                "search": "search"
            },
            search: function () {
                app.useLayout("main").setViews({
                    "section": new Views.Layout({
                        views: {
                            "#searchresult" : new Views.SearchResult({
                                collection: tickets
                            }),
                            "#projects" : new Views.Projects({
                            })
                        }
                    })
                }).render();
                    
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
