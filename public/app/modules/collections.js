define(['backbone', 'modules/models'], function (Backbone, Models) {

    var Collections = {};

    Collections.Projects = Backbone.Collection.extend({
        model: Models.Project,
        url: function () {
            if (this.workspace_id)
                return '/api/project/?workspace=' + this.workspace_id;
            else
                return '/api/project/';
        }
    });

    Collections.Workspaces = Backbone.Collection.extend({
        model: Models.Workspace,
        url: '/api/workspace'
    });

    return Collections;

});