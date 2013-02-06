define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash",

    "modules/auth"
],

    function (app, Backbone, $, _, Auth) {

        var Views = {};

        Views.Layout = Backbone.Layout.extend({
            template: "workspace/layout",
            className: 'row',
            initialize: function () {

                this.setViews({
                    "#middle-sidebar": new Views.Info(),
                    "#left-sidebar": new Views.List({
                        collection: this.collection
                    })
                });

                this.listenTo(app, "workspace:selected", function (id) {

                    var openedForm = this.getView('#middle-sidebar');

                    if (openedForm.model && id == openedForm.model.id)
                        return;

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate('workspace/' + id);
                                // existing workspace
                                var workspace = new app.models.Workspace({ _id: id});
                                workspace.setPermission('visible');
                                workspace.fetch({
                                    success: _.bind(function (model) {
                                        if (model.isAdministrator(app.global.user)) {
                                            this.setViews({
                                                "#middle-sidebar": new Views.Form({
                                                    collection: this.collection,
                                                    model: model
                                                })
                                            });
                                        } else {
                                            this.setViews({
                                                "#middle-sidebar": new Views.Watch({
                                                    collection: this.collection,
                                                    model: model
                                                })
                                            });
                                        }
                                    }, this)
                                });
                            } else {
                                app.router.navigate('workspace/add');
                                // new workspace
                                this.setViews({
                                    "#middle-sidebar": new Views.Form({
                                        collection: this.collection,
                                        model: new app.models.Workspace()
                                    })
                                });
                                this.getView('#middle-sidebar').render();
                            }
                        }
                    }, this));
                }, this);

                this.listenTo(app, "workspace:deselected", function () {
                    this.setViews({
                        "#middle-sidebar": new Views.Info()
                    });
                    this.getView('#middle-sidebar').render();
                    app.router.navigate('workspace');
                }, this);

                if (this.options.workspace_id)
                    app.trigger('workspace:selected', this.options.workspace_id);
            }
        });

        Views.Info = Backbone.Layout.extend({
            template: 'workspace/info',
            events: {
                'click .show-form': 'toggleForm'
            },
            toggleForm: function () {
                app.trigger('workspace:selected');
            },
            close: function (callback) {
                callback(true);
            }
        });

        Views.List = Backbone.Layout.extend({
            template: 'workspace/list',
            id: "workspaces",
            events: {
                'click .show-form': 'toggleForm',
                'click a': 'selected'
            },
            initialize: function () {
                this.listenTo(this.collection, "sync", this.render);
                this.listenTo(this.collection, "add", this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    workspaces: this.collection
                };
            },
            selected: function (e) {
                app.trigger('workspace:selected', $(e.target).data('id'));
                return false;
            },
            toggleForm: function () {
                app.trigger('workspace:selected');
                return false;
            }
        });

        Views.Form = app.views.Form.extend({
            template: "workspace/form",
            events: {
                'click .submit-form': 'saveWorkspace'
            },
            constructor: function () {
                this.app = app;
                this.events = _.extend({}, this.constructor.__super__.events, this.events);
                this.constructor.__super__.constructor.apply(this, arguments);
            },
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo(app.global.user, 'sync', this.render);
                this.listenTo($(window), 'unload', this.closeForm);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    workspace: this.model,
                    domain: hostname
                };
            },
            saveWorkspace: function () {
                var view = this;
                var isNew = this.model.isNew();
                var workspace = new app.models.Workspace();
                var attrs = _.extend({ _id: this.model.id }, this.$el.find('form').serializeObject());
                workspace.save(attrs, {
                    success: function (model) {
                        view.model.set(model.attributes);
                        view.justSaved = true;
                        view.render();
                        if (isNew)
                            view.collection.push(model);
                        app.router.navigate('workspace/' + model.id);
                        app.trigger('workspace:updated', view.model);
                    },
                    error: function (model, res) {
                        var err;
                        try {
                            err = ($.parseJSON(res.responseText)).error;
                        } catch (e) {
                            return;
                        }

                        if (err._modal)
                            app.showModal(err._modal.message);

                        $(':input + .error', self.el).html('');
                        $(':input', self.el).parents('.control-group').removeClass('error');
                        _.each(err, function (value, field) {
                            var selector = '[name="' + field + '"]:input';
                            $(selector, self.el).parents('.control-group').addClass('error');
                            $(selector, self.el).siblings('.error').html(t(value.message));
                        });
                    }
                });
                return false;
            },
            closeForm: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('workspace:deselected');
                });
            }
        });

        Views.Watch = Backbone.Layout.extend({
            template: 'workspace/watch',
            events: {
                'click .watch': 'toggleWatch'
            },
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo(app.global.user, 'sync', this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    domain: hostname,
                    workspace: this.model
                };
            },
            toggleWatch: function () {
                if (this.model.isWatcher(app.global.user)) {
                    this.model.unwatch({
                        error: _.bind(function () {
                            $('.watch', this.$el).addClass('btn-danger');
                            $(this.$el);
                        }, this)
                    });
                } else {
                    this.model.watch({
                        error: _.bind(function () {
                            $('.watch', this.$el).addClass('btn-danger');
                            $(this.$el);
                        }, this)
                    });
                }
            },
            close: function (callback) {
                callback(true);
            },
            closeForm: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('workspace:deselected');
                });
            }
        });

        return Views;
    })
;
