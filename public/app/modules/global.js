define(["app", "lodash", "modules/models", "modules/collections"], function (app, _, Models, Collections) {

    var Global = app.module();

    var user = Global.user = new Models.User();
    var workspaces = Global.workspaces = new Collections.Workspaces();
    var projects = Global.projects = new Collections.Projects();
    var tasks = Global.tasks = new Collections.Tasks();
    var workspace = Global.workspace = new Models.Workspace();

    user.on('authorized', function () {

        var counter = 3;
        var finish = function () {
            if (!--counter) app.trigger('user:authorized', user);
        };

        workspaces.fetch().done(finish);

        var domainre = new RegExp("^(.*)?\\." + hostname);
        var subdomain = document.location.hostname.match(domainre);
        if (subdomain && subdomain[1] && subdomain[1] != 'app') {
            (function () {
                var workspaces = new Collections.Workspaces();
                workspaces.setSubdomain(subdomain[1]);
                workspaces.fetch({
                    success: function (data) {
                        if (data.models.length) {
                            workspace.set(data.models[0].attributes);
                            workspace.trigger("sync", workspace);

                            /* filtering projects */
                            projects.setWorkspace(workspace.id);
                            projects.fetch().done(finish);

                            /* filtering tasks */
                            tasks.setWorkspace(workspace.id);
                            tasks.fetch().done(finish);

                        }
                    }
                });

            })();
        } else {
            projects.fetch().done(finish);
            workspaces.fetch().done(finish);
        }
    });

    user.on('deauthorized', function () {
        workspace.clear();
        workspaces.reset();
        projects.reset();
        tasks.reset();
        app.trigger('user:deauthorized', user);
    });

    app.on('workspace:updated', function () {
        workspaces.fetch();
    });

    app.on('project:updated', function () {
        projects.fetch();
    });

    return Global;
});