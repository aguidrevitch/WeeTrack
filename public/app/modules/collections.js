define(['backbone', 'modules/models'], function (Backbone, Models) {

    var Collections = {};

    Collections.Projects = Backbone.Collection.extend({
        model: Models.Project,
        url: function () {
            var query = {}

            if (this.workspace)
                query.workspace = this.workspace;

            if (this.perm)
                query.perm = this.perm;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return '/api/project/?' + qs.join('&');
            } else {
                return '/api/project/';
            }
        },
        setWorkspace: function (id) {
            this.workspace = id;
        },
        getWorkspace: function () {
            return this.workspace;
        },
        setPermission: function (perm) {
            this.perm = perm;
        },
        getPermission: function () {
            return this.perm;
        }
    });

    Collections.Workspaces = Backbone.Collection.extend({
        model: Models.Workspace,
        url: function () {
            var query = {}

            if (this.perm)
                query.perm = this.perm;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return '/api/workspace/?' + qs.join('&');
            } else {
                return '/api/workspace/';
            }
        }
    });

    return Collections;

});