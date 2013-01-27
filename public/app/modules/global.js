define(["app", "modules/models", "modules/collections"], function (app, Models, Collections) {

    var Global = app.module();

    var user = Global.user = new Models.User();
    var workspaces = Global.workspaces = new Collections.Workspaces();
    var projects = Global.projects = new Collections.Projects();
    var tasks = Global.tasks = new Collections.Tasks();

    user.on('authorized', function () {
        workspaces.fetch();
        projects.fetch();
        tasks.fetch();
        app.trigger('user:authorized', user);
    });

    user.on('deauthorized', function () {
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