define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash",

    // Views
    "modules/home/form"
],

    function (app, Backbone, $, _, Form) {

        var Views = {
            Form: Form
        };

        Views.Layout = Backbone.Layout.extend({
            template: "home/layout",
            className: 'row',
            initialize: function () {
                this.workspace = this.options.workspace;
                this.workspaces = this.options.workspaces;
                this.projects = this.options.projects;

                this.setViews({
                    "#top-sidebar": new Views.Filter({
                        workspaces: this.workspaces,
                        projects: this.projects
                    }),
                    "#left-sidebar": new Views.List({
                        collection: this.collection
                    }),
                    "#right-sidebar": new Views.Info({
                        //model: new app.models.Task()
                    })
                });

                this.listenTo(app, 'task:selected', function (id) {
                    var openedForm = this.getView('#right-sidebar');

                    if (openedForm.model && id == openedForm.model.id)
                        return;

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate(id);
                                // existing project
                                var task = new app.models.Task({ id: id });
                                task.setWorkspace(app.global.workspace.id);
                                this.setViews({
                                    "#right-sidebar": new Views.Form({
                                        projects: this.projects,
                                        model: task
                                    })
                                });
                                task.fetch();
                            } else {
                                app.router.navigate('add');

                                var task = new app.models.Task();
                                task.setWorkspace(app.global.workspace.id);
                                // new project
                                this.setViews({
                                    "#right-sidebar": new Views.Form({
                                        projects: this.projects,
                                        model: task
                                    })
                                });
                                this.getView('#right-sidebar').render();
                            }
                        }
                    }, this));
                }, this);

                this.listenTo(app, 'task:deselected', function () {
                    this.setViews({
                        "#right-sidebar": new Views.Info({
                            model: new app.models.Task()
                        })
                    });
                    this.getView('#rigth-sidebar').render();
                    app.router.navigate('');
                }, this);

                if (this.options.task_id)
                    app.trigger('task:selected', this.options.task_id);
            }
        });

        Views.Filter = Backbone.Layout.extend({
            template: 'home/filter'
        });

        Views.Info = Backbone.Layout.extend({
            template: 'home/info',
            close: function (callback) {
                callback(true);
            }
        });

        Views.List = Backbone.Layout.extend({
            template: 'home/list',
            id: "tasks",
            events: {
                'click .show-form': 'toggleForm',
                'click a': 'selected'
            },
            initialize: function () {
                this.listenTo(this.collection, 'add', this.render);
            },
            serialize: function () {
                return {
                    tasks: this.collection,
                    workspaces: this.workspaces
                };
            },
            selected: function (e) {
                // app.trigger('task:selected', $(e.target).data('id'));
                return false;
            },
            toggleForm: function () {
                app.trigger('task:selected');
                return false;
            }
        });

        return Views;
    });
