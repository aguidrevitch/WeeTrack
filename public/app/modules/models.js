define(["backbone"], function (Backbone) {

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
                    success(model, xhr, options)
            };
            Backbone.Model.prototype.save.call(this, attrs, options);
        }
    });

    Models.Project = Backbone.Model.extend({
        idAttribute: "_id",
        url: function () {
            return this.id ? '/api/project/' + this.id : '/api/project';
        }
    });

    Models.Workspace = Backbone.Model.extend({
        idAttribute: "_id",
        url: function () {
            return this.id ? '/api/workspace/' + this.id : '/api/workspace';
        }
    });

    return Models;
});