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
            template: "project/layout",
            className: 'row',
            initialize: function () {

                this.workspaces = this.options.workspaces;
                this.workspace = this.options.workspace;

                this.setViews({
                    "#middle-sidebar": new Views.Info({
                        collection: this.workspaces
                    }),
                    "#left-sidebar": new Views.List({
                        collection: this.collection,
                        workspaces: this.workspaces
                    })
                });

                this.listenTo(app, 'project:selected', function (id) {
                    var openedForm = this.getView('#middle-sidebar');

                    if (openedForm.model && id == openedForm.model.id)
                        return;

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate('project/' + id);
                                // existing project
                                var project = new app.models.Project({ _id: id });
                                project.setPermission('visible');
                                project.fetch({
                                    success: _.bind(function (model) {
                                        if (model.isAdministrator(app.global.user)) {
                                            this.setViews({
                                                "#middle-sidebar": new Views.Form({
                                                    collection: this.collection,
                                                    workspace: this.workspace,
                                                    model: model
                                                })
                                            });
                                        } else {
                                            this.setViews({
                                                "#middle-sidebar": new Views.Readonly({
                                                    collection: this.collection,
                                                    workspace: this.workspace,
                                                    model: model
                                                })
                                            });
                                        }
                                    }, this)
                                });
                            } else {
                                app.router.navigate('project/add');
                                // new project
                                this.setViews({
                                    "#middle-sidebar": new Views.Form({
                                        model: new app.models.Project(),
                                        collection: this.collection,
                                        workspaces: this.workspaces,
                                        workspace: this.workspace
                                    })
                                });
                                this.getView('#middle-sidebar').render();
                            }
                        }
                    }, this));
                }, this);

                this.listenTo(app, 'project:deselected', function () {
                    this.setViews({
                        "#middle-sidebar": new Views.Info({
                            collection: this.workspaces
                        })
                    });
                    this.getView('#middle-sidebar').render();
                    app.router.navigate('project');
                }, this);

                if (this.options.project_id)
                    app.trigger('project:selected', this.options.project_id);
            }

        });

        Views.Info = Backbone.Layout.extend({
            template: 'project/info',
            events: {
                'click .show-form': 'toggleForm'
            },
            initialize: function () {
                this.listenTo(this.collection, 'sync', this.render);
            },
            serialize: function () {
                return {
                    workspaces: this.collection
                };
            },
            toggleForm: function () {
                app.trigger('project:selected');
            },
            close: function (callback) {
                callback(true);
            }
        });

        Views.List = Backbone.Layout.extend({
            template: 'project/list',
            id: "projects",
            events: {
                'click .show-form': 'toggleForm',
                'click a': 'selected'
            },
            initialize: function () {
                this.listenTo(this.collection, 'sync', this.render);
                this.listenTo(this.collection, 'add', this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    projects: this.collection
                };
            },
            selected: function (e) {
                app.trigger('project:selected', $(e.target).data('id'));
                return false;
            },
            toggleForm: function () {
                app.trigger('project:selected');
                return false;
            }
        });

        Views.Form = app.views.Form.extend({
            template: "project/form",
            events: _.extend({
                'click .submit-form': 'saveProject'
            }, app.views.Form.prototype.events),
            initialize: function () {
                this.workspace = app.global.workspace;
                this.user = app.global.user;
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo($(window), 'beforeunload', this.closeInternal);
            },
            serialize: function () {
                return {
                    user: this.user,
                    domain: this.workspace.escape('subdomain') + '.' + hostname,
                    project: this.model
                };
            },
            saveProject: function () {
                var view = this;
                var isNew = this.model.isNew();
                var project = new app.models.Project({ _id: this.model.id });
                var attrs = _.extend({workspace: this.workspace.id }, this.$el.find('form').serializeObject());
                project.save(attrs, {
                    success: function (model) {
                        view.model.set(model.attributes);
                        view.justSaved = true;
                        view.render();
                        if (isNew)
                            view.collection.push(model);
                        app.trigger('project:selected', view.model.id);
                        app.trigger('project:updated', view.model);
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
                        app.trigger('project:deselected');
                });
            }
        });

        Views.Readonly = Backbone.Layout.extend({
            template: 'project/readonly',
            initialize: function () {
                this.workspace = this.options.workspace;
                this.listenTo(app.global.user, 'sync', this.render);
                this.listenTo(this.model, 'sync', this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    domain: this.workspace.escape('subdomain') + '.' + hostname,
                    project: this.model
                };
            },
            close: function (callback) {
                callback(true);
            },
            closeInternal: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('workspace:deselected');
                });
            }
        });

        return Views;
    });
