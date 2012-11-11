define([
    // Application.
    "app",
    "router",

    // Views
    "modules/search/views"

],

    function (app, router, Views) {

        var Search = app.module();

        var Router = router.extend({
            authorized: {
                "search": "search",
                "search/:task": "search"
            },
            search: function (task_id) {
                app.layout.setViews({
                    "section": new Views.Layout({ task_id: task_id })
                }).render();
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
