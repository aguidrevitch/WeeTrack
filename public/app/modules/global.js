define(["app", "lodash", "modules/models", "modules/collections"], function (app, _, Models, Collections) {

    var Global = app.module();

    var user = Global.user = new Models.User();
    var workspaces = Global.workspaces = new Collections.Workspaces();
    var projects = Global.projects = new Collections.Projects();
    var tasks = Global.tasks = new Collections.Tasks();
    var workspace = Global.workspace = new Models.Workspace();

    _.each([workspaces, projects, tasks], function (obj) {
        obj.setPermission('visible');
    });

    user.on('authorized', function () {
        workspaces.fetch();

        var domainre = new RegExp("^(.*)?\\." + hostname);
        var subdomain = document.location.hostname.match(domainre);
        if (subdomain && subdomain[1] && subdomain[1] != 'app') {
            (function () {
                var workspaces = new Collections.Workspaces();
                workspaces.setSubdomain(subdomain[1]);
                workspaces.setPermission('visible');
                workspaces.fetch({
                    success: function (data) {
                        if (data.models.length) {
                            workspace.set(data.models[0].attributes);
                            workspace.trigger("sync", workspace);

                            /* filtering projects */
                            projects.setWorkspace(workspace.id);
                            projects.fetch();

                            /* filtering tasks */
                            tasks.setWorkspace(workspace.id);
                            tasks.fetch();
                        }
                    }
                });

            })();
        } else {
            projects.fetch();
            workspaces.fetch();
        }
        app.trigger('user:authorized', user);
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