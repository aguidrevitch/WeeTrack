define([
    // Application.
    "app",
    "router",

    // Views
    "modules/search/views",

],

    function (app, router, Views) {

        var Search = app.module();

        var Router = router.extend({
            authorized: {
                "search": "search",
                "search/:task": "search"
            },
            search: function (id) {
                app.layout.setViews({
                    "section": new Views.Layout({
                        taskId: id
                    })
                }).render();
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
