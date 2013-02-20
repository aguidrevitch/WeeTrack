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
                                        this.setViews({
                                            "#middle-sidebar": new Views.Form({
                                                collection: this.collection,
                                                model: model
                                            })
                                        });
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
            events: _.extend({
                'click .submit-form': 'saveWorkspace'
            }, app.views.Form.prototype.events),
            initialize: function () {
                this.user = app.global.user;
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo($(window), 'beforeunload', this.closeInternal);
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
                        app.trigger('workspace:selected', model.id);
                        app.trigger('workspace:updated', view.model);
                    },
                    error: _.bind(app.views.defaultErrorHandler, this)
                });
                return false;
            },
            showConfirm: app.showConfirm,
            showModal: app.showModal,
            closeInternal: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('workspace:deselected');
                });
            }
        });

        return Views;
    })
;
