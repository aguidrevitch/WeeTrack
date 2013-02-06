define(['backbone', 'modules/models', 'modules/transaction'], function (Backbone, Models, Transaction) {

    var Collections = {};

    Collections.Workspaces = Backbone.Collection.extend({
        model: Models.Workspace,
        url: function () {
            var query = {};

            if (this.perm)
                query.perm = this.perm;

            if (this.subdomain)
                query.subdomain = this.subdomain;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return '/api/workspace/?' + qs.join('&');
            } else {
                return '/api/workspace/';
            }
        },
        setSubdomain: function (id) {
            this.subdomain = id;
        },
        getSubdomain: function () {
            return this.subdomain;
        },
        setPermission: function (perm) {
            this.perm = perm;
        },
        getPermission: function () {
            return this.perm;
        }
    });

    Collections.Projects = Backbone.Collection.extend({
        model: Models.Project,
        url: function () {
            var query = {};

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

    Collections.Tasks = Backbone.Collection.extend({
        model: Models.Task,
        workspace: 'all',
        url: function () {
            var query = {};

            if (this.perm)
                query.perm = this.perm;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return '/api/task/' + this.workspace + '/?' + qs.join('&');
            } else {
                return '/api/task/' + this.workspace;
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

    Collections.Transactions = Transaction.Collection;

    return Collections;
});