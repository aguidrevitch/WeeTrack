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
            search: function (task_id) {
                Layout.setTaskId(task_id);
                if (!this._rendered) {
                    app.layout.setViews({
                        "section": Layout
                    }).render();
                    this._rendered = true;
                }
            }
        });

        Search.Router = new Router();

        // Return the module for AMD compliance.
        return Search;

    });
