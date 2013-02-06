define(["backbone", "modules/transaction"], function (Backbone, Transaction) {

    var Models = {};

    Models.User = Backbone.Model.extend({
        idAttribute: "_id",
        url: '/api/auth',
        authorizeSession: function () {
            var self = this;
            this.fetch({
                error: function () {
                    self.trigger('deauthorized');
                },
                success: function () {
                    self.trigger('authorized');
                }
            });
        },
        authorize: function (attrs, options) {
            var self = this;
            this.fetch({
                data: {
                    email: attrs.email,
                    password: attrs.password,
                    remember_me: attrs.remember_me
                },
                error: function (model, res) {
                    var error = ($.parseJSON(res.responseText)).error;

                    self.set({ _id: null });

                    self.trigger('deauthorized');
                    if (options.error)
                        options.error(error);
                },
                success: function (model, res) {
                    self.trigger('authorized');
                    if (options.success)
                        options.success(model, res);
                }
            });
        },
        deauthorize: function () {
            var self = this;
            self.destroy({
                success: function () {
                    self.set({ _id: null });
                    self.trigger('deauthorized');
                }
            });
        },
        save: function (attrs, options) {
            options = options || {};
            var success = options.success;
            options.success = function (model, xhr, options) {
                model.trigger('authorized');
                if (success)
                    success(model, xhr, options);
            };
            Backbone.Model.prototype.save.call(this, attrs, options);
        }
    });

    var PermissionModel = Backbone.Model.extend({
        getAccess: function (user) {
            return {
                admin: _.filter(this.get('admin'), function (o) {
                    return user.id == o._id;
                }),
                admincc: _.filter(this.get('admincc'), function (o) {
                    return user.id == o._id;
                }),
                cc: _.filter(this.get('cc'), function (o) {
                    return user.id == o._id;
                }),
                watch: _.filter(this.get('watch'), function (o) {
                    return user.id == o._id;
                })
            };
        },
        isAdministrator: function (user) {
            return (this.getAccess(user)).admin.length > 0;
        },
        isUser: function (user) {
            return (this.getAccess(user)).admincc.length > 0;
        },
        isClient: function (user) {
            return (this.getAccess(user)).cc.length > 0;
        },
        isWatcher: function (user) {
            return (this.getAccess(user)).watch.length > 0;
        },
        canWatch: function (user) {
            var access = this.getAccess(user);
            return access.admin.length + access.admincc.length + access.cc.length > 0;
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

            if (this._watch)
                query.watch = this._watch;

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
        watch: function (options) {
            this._watch = 'true';
            this.save({}, options);
        },
        unwatch: function (options) {
            this._watch = 'false';
            this.save({}, options);
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

            if (this._watch)
                query.watch = this._watch;

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
            if (!this.transactions)
                this.transactions = new Transaction.Collection();
            this.transactions.reset(response.transactions);
            delete response.transactions;
            return response;
        }
    });

    Models.Transaction = Transaction.Model;

    return Models;
});