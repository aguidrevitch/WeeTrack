define(['backbone', 'modules/models'], function (Backbone, Models) {

    var Collections = {};

    Collections.Projects = Backbone.Collection.extend({
        model: Models.Project,
        url: function () {
            if (this.workspace)
                return '/api/project/?workspace=' + this.workspace;
            else
                return '/api/project/';
        },
        setWorkspace: function (id) {
            this.workspace = id;
        }
    });

    Collections.Workspaces = Backbone.Collection.extend({
        model: Models.Workspace,
        url: '/api/workspace'
    });

    return Collections;

});