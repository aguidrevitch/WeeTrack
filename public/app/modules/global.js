define(["app", "modules/models", "modules/collections"], function (app, Models, Collections) {

    var Global = app.module();

    var workspaces = Global.workspaces = new Collections.Workspaces();
    var projects = Global.projects = new Collections.Projects();

    app.on('user:authorized', function () {
        workspaces.fetch();
        projects.fetch();
    });

    app.on('workspace:updated', function () {
        workspaces.fetch();
    });

    app.on('project:updated', function () {
        projects.fetch();
    });

    return Global;
});