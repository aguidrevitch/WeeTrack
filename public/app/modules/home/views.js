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
            Add: Form.Add,
            Edit: Form.Edit,
            View: Form.View
        };

        Views.Layout = Backbone.Layout.extend({
            template: "home/layout",
            className: 'row',
            initialize: function () {
                this.setViews({
                    "#top-sidebar": new Views.Filter({
                    }),
                    "#left-sidebar": new Views.List({
                        collection: app.global.tasks
                    }),
                    "#right-sidebar": new Views.Info({
                    })
                });

                this.listenTo(app, 'task:selected', function (id, forceClose) {
                    var task;
                    var openedForm = this.getView('#right-sidebar');

                    if (!forceClose && openedForm.model && id == openedForm.model.id)
                        return;

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate('/' + id);
                                // existing project
                                task = new app.models.Task({ id: id });
                                task.setWorkspace(app.global.workspace.id);
                                this.setViews({
                                    "#right-sidebar": new Views.View({
                                        model: task
                                    })
                                });
                                task.fetch();
                            } else {
                                app.router.navigate('/add');

                                task = new app.models.Task();
                                task.setWorkspace(app.global.workspace.id);
                                // new project
                                this.setViews({
                                    "#right-sidebar": new Views.Add({
                                        model: task
                                    })
                                });
                                this.getView('#right-sidebar').render();
                            }
                        }
                    }, this));
                }, this);

                this.listenTo(app, 'task:edit', function (id) {
                    var task;
                    var openedForm = this.getView('#right-sidebar');

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate('/' + id);
                                // existing project
                                task = new app.models.Task({ id: id });
                                task.setWorkspace(app.global.workspace.id);
                                this.setViews({
                                    "#right-sidebar": new Views.Edit({
                                        model: task
                                    })
                                });
                                this.getView('#right-sidebar').render();
                                task.fetch();
                            }
                        }
                    }, this));
                }, this);

                this.listenTo(app, 'task:deselected', function () {
                    this.setViews({
                        "#right-sidebar": new Views.Info()
                    });
                    this.getView('#right-sidebar').render();
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
                'click a': 'selected'
            },
            selectedId: null,
            initialize: function () {
                this.listenTo(this.collection, 'sync', this.render);
                this.listenTo(this.collection, 'add', this.render);

                this.listenTo(app, 'task:selected', function (id) {
                    this.selectedId = id;
                    $('.selected', this.$el).removeClass('selected');
                    $('[data-id=' + id + ']', this.$el).addClass('selected');
                });

                this.listenTo(app, 'task:deselected', function () {
                    $('.selected', this.$el).removeClass('selected');
                    this.selectedId = null;
                });
            },
            updateSelectedElement: function (oldId, newId) {
                $('.selected', this.$el).removeClass('selected');
            },
            serialize: function () {
                return {
                    tasks: this.collection
                };
            },
            afterRender: function () {
                if (this.selectedId) {
                    var el = $('[data-id=' + this.selectedId + ']', this.$el);
                    if (el.length) {
                        el.addClass('selected');
                        $(this.$el).animate({
                            scrollTop: el.offset().top
                        }, 1000);
                    }
                }
            },
            selected: function (e) {
                app.trigger('task:selected', $(e.target).data('id'));
                return false;
            }
        });

        return Views;
    });
