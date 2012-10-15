define([
    // Application.
    "app",
    "router",

    // Views
    "modules/search/views",
    "modules/auth"

    ],

    function(app, router, Views, Auth) {

        var Search = app.module();

        var Router = router.extend({
            authorized: {
                "search": "search"
            },
            search: function () {
                app.layout.setViews({
                    "section": new Views.Layout({
                        views: {
                            "#left-sidebar" : new Views.Projects({
                                collection: Auth.getProjects()
                            }),
                            "#right-sidebar" : new Views.Tasks({
                                collection: Auth.getTasks()
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
