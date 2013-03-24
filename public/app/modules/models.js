define(["backbone", "modules/transaction"], function (Backbone, Transaction) {

    var Models = {};

    Models.User = Backbone.Model.extend({
        idAttribute: "_id",
        url: '/api/auth',
        authorizeSession: function () {
            this.fetch({
                error: _.bind(function () {
                    this.trigger('deauthorized');
                }, this),
                success: _.bind(function () {
                    this.trigger('authorized');
                }, this)
            });
        },
        authorize: function (attrs, options) {
            return this.fetch({
                data: attrs,
                error: _.bind(function (model, res) {
                    var error = ($.parseJSON(res.responseText)).error;

                    this.set({ _id: null });
                    this.trigger('deauthorized');

                    if (options.error)
                        options.error(error);
                }, this),
                success: _.bind(function (model, res) {
                    this.trigger('authorized');
                    if (options.success)
                        options.success(model, res);
                }, this)
            });
        },
        deauthorize: function () {
            return this.destroy({
                success: _.bind(function () {
                    this.set({ _id: null });
                    this.trigger('deauthorized');
                }, this)
            });
        },
        save: function (attrs, options) {
            options = options || {};
            var success = options.success;
            options.success = _.bind(function (model, xhr, options) {
                this.trigger('authorized');
                if (success)
                    success(model, xhr, options);
            }, this);
            Backbone.Model.prototype.save.call(this, attrs, options);
        }
    });

    var PermissionModel = Backbone.Model.extend({
        hasPermission: function (perm) {
            return _.indexOf(this.get('permissions'), perm) != -1;
        },
        setPermission: function (perm) {
            this.perm = perm;
        },
        getPermission: function () {
            return this.perm;
        },
        url: function () {
            var url = this.id ? this.baseUrl + '/' + this.id : this.baseUrl + '/';
            var query = {};

            if (this.perm)
                query.perm = this.perm;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return url + '?' + qs.join('&');
            } else {
                return url;
            }
        }
    });

    Models.Workspace = PermissionModel.extend({
        idAttribute: "_id",
        baseUrl: '/api/workspace'
    });

    Models.Project = PermissionModel.extend({
        idAttribute: "_id",
        baseUrl: '/api/project'
    });

    Models.Task = PermissionModel.extend({
        baseUrl: '/api/task',
        url: function () {
            var url = this.id ? this.baseUrl + '/' + this.workspace + '/' + this.id : this.baseUrl + '/' + this.workspace;

            var query = {};

            if (this.perm)
                query.perm = this.perm;

            if (this._validateOnServer)
                query.validate = this._validateOnServer;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return url + '?' + qs.join('&');
            } else {
                return url;
            }
        },
        setWorkspace: function (id) {
            this.workspace = id;
        },
        getWorkspace: function () {
            return this.workspace;
        },
        initialize: function (attributes) {
            this.transactions = new Transaction.Collection();
            if (attributes && attributes.transactions)
                this.transactions.reset(attributes.transactions);
        },
        parse: function (response) {
            this.transactions = new Transaction.Collection();
            this.transactions.reset(response.transactions);
            delete response.transactions;
            return response;
        },
        validateOnServer: function (attributes, options) {
            var self = this;
            this._validateOnServer = 'true';
            this.save(attributes, {
                success: function (model) {
                    delete(self._validateOnServer);
                    if (options.success) options.success(model);
                },
                error: function (model, res) {
                    delete(self._validateOnServer);
                    if (options.error) options.error(model, res);
                }
            });
        }
    });

    Models.Comment = Backbone.Model.extend({
        idAttribute: '_id',
        baseUrl: '/api/comment',
        url: function () {
            var url = this.id ? this.baseUrl + '/' + this.workspace + '/' + this.task + '/' + this.id : this.baseUrl + '/' + this.workspace + '/' + this.task;

            var query = {};

            if (this._validateOnServer)
                query.validate = this._validateOnServer;

            if (_.keys(query).length) {
                var qs = [];
                _.each(query, function (value, key) {
                    qs.push(key + '=' + value);
                });
                return url + '?' + qs.join('&');
            } else {
                return url;
            }
        },
        setWorkspace: function (id) {
            this.workspace = id;
        },
        getWorkspace: function () {
            return this.workspace;
        },
        setTask: function (id) {
            this.task = id;
        },
        getTask: function () {
            return this.task;
        },
        parse: function (response) {
            this.transactions = new Transaction.Collection();
            this.transactions.reset(response.transactions);
            delete response.transactions;
            return response;
        },
        validateOnServer: function (attributes, options) {
            var self = this;
            this._validateOnServer = 'true';
            this.save(attributes, {
                success: function (model) {
                    delete(self._validateOnServer);
                    if (options.success) options.success(model);
                },
                error: function (model, res) {
                    delete(self._validateOnServer);
                    if (options.error) options.error(model, res);
                }
            });
        }
    });

    Models.Transaction = Transaction.Model;

    return Models;
});