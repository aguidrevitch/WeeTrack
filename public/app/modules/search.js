define([
    // Application.
    "app",
    "router",

    // Views
    "modules/search/views"

],

    function (app, router, Views) {

        var Search = app.module();

        var Layout = new Views.Layout();

        var Router = router.extend({
            authorized: {
                "search": "search",
                "search/:task": "search"
            },
            search: function (id) {
                Layout.setTaskId(id);
                app.layout.setViews({
                    "section": Layout
                }).render();
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
