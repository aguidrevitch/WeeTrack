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
            TransactionForm: Form.TransactionForm
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

        Views.Filter = app.views.Form.extend({
            template: 'home/filter',
            events: {
                'click .my': 'setMy',
                'click .clear': 'clearFilter'
            },
            initialize: function () {
                this.user = app.global.user;
                this.listenTo(app.global.projects, 'sync', this.render);
                this.listenTo(this.user, 'sync', this.render);
            },
            serialize: function () {
                return {
                    projects: app.global.projects
                };
            },
            afterRender: function () {
                $("[name=project]", this.$el).select2({
                    allowClear: true
                });
                $("[name=status]", this.$el).select2({
                    multiple: true,
                    allowClear: true,
                    data: [
                        {id: 'new', text: t('New')},
                        {id: 'open', text: t('Open')},
                        {id: 'closed', text: t('Closed')},
                        {id: 'resolved', text: t('Resolved')}
                    ]
                });
                $("[name=owner]", this.$el).select2(
                    this.userListSelect2Options({
                        multiple: false,
                        allowClear: true,
                        initSelection: _.bind(function (element, callback) {
                            callback(element.select2("data"));
                        }, this)
                    })
                );

                this.setMy();

                $("[name=project]", this.$el).on("change", _.bind(this.filter, this));
                $("[name=owner]", this.$el).on("change", _.bind(this.filter, this));
                $("[name=status]", this.$el).on("change", _.bind(this.filter, this));

                this.filter();
            },
            setMy: function () {
                $("[name=owner]").select2("data", {
                    id: this.user.id,
                    text: this.user.escape('name') || this.user.escape('email')
                });
                $("[name=owner]").select2("val", this.user.id, true);
                return false;
            },
            clearFilter: function () {
                console.log(1);
                $('[name=owner]').select2('val', ''); // wont trigger change
                $('[name=status]').select2('val', ''); // wont trigger change
                $('[name=project]').val('');
                return false;
            },
            filter: function () {
                app.global.tasks.setProject(this.$el.find('form [name=project]').val());
                app.global.tasks.setOwner(this.$el.find('form [name=owner]').select2("val"));
                app.global.tasks.setStatus(this.$el.find('form [name=status]').val());
                app.global.tasks.fetch();
                return false;
            }
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

        Views.View = Backbone.Layout.extend({
            template: 'home/view',
            id: "task-details",
            events: {
                'click .show-form': 'toggleForm',
                'click .close-details': 'closeInternal'
            },
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
                //this.listenTo(this.model, 'change', this.render);
                this.listenTo(app.global.projects, 'sync', this.render);
            },
            serialize: function () {
                return {
                    task: this.model,
                    projects: app.global.projects
                };
            },
            beforeRender: function () {
                this.model.transactions.each(function (transaction) {
                    this.insertView('#transactions', new Views.Transaction({
                        task: this.model,
                        model: transaction
                    }));
                }, this);
            },
            toggleForm: function () {
                var form = this.getView('.transaction-form-container');
                if (form) {
                    form.closeInternal();
                } else {
                    this.insertView('.transaction-form-container', new Views.TransactionForm({
                        model: this.model
                    })).render();
                }
            },
            afterRender: function () {
                $('#transactions', this.$el).scrollTop($('#transactions :last', this.$el).prop("scrollHeight"));
                if (this.model.transactions) {
                    $('.reply a, .comment a', this.$el).off('click', null, null);
                    $('.reply a, .comment a', this.$el).on("click", _.bind(function (e) {
                        var $el = $(e.target);
                        var transaction = this.model.transactions.findWhere({ _id: $el.data('id')}), text;
                        if (transaction) {
                            text = transaction.escape('value');
                        }
                        this.insertView('.transaction-form-container', new Views.TransactionForm({
                            model: this.model,
                            type: $el.data('type'),
                            text: text
                        })).render();

                        return false;
                    }, this));
                }
            },
            closeInternal: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('task:deselected');
                });
            },
            close: function (callback) {
                var form = this.getView('.transaction-form-container');
                if (form)
                    form.close(function (yes) {
                        callback(yes);
                    });
                else
                    callback(true);
            }
        });

        Views.Transaction = Backbone.Layout.extend({
            template: "home/transaction",
            serialize: function () {
                return {
                    workspace: app.global.workspace,
                    task: this.options.task,
                    transaction: this.model
                };
            },
            buildUL: function (tree) {
                //console.log('here');
                var tag = $('<ul></ul>');
                //console.log(tree);
                for (var i = 0; i < tree.length; i++)  {
                    var container = tree[i];
                    //console.log(container);
                    if (container.text || container.text === "") {
                        //console.log("adding " + container.text);
                        tag.append($('<li></li>').text(container.text));
                    } else {
                        //console.log('recursing', container);
                        var result = this.buildUL(container.child);
                        tag.append($('<li></li>').append(result));
                    }
                };
                return tag;
            },
            afterRender: function () {
                console.log('--------------------------');
                var stripped = $('.collapsible-text', this.$el).text();
                var lines = stripped.match(/^(.*)/mg);
                var tree = { child: [] };
                var container = tree;
                var lastDepth = 0;
                _.each(lines, function (line) {
                    if (line.match(/^>/)) {
                        var depth = 0;
                        while (line.match(/^>/)) {
                            depth++;
                            line = line.replace(/^>/, '');
                        }
                        var actualDepth = depth;
                        if (depth > lastDepth) {
                            while (depth > lastDepth) {
                                //console.log('adding container');
                                var node = { parent: container, child: [] };
                                container.child.push(node);
                                container = node;
                                depth--;
                            }
                        } else {
                            while (depth < lastDepth) {
                                //console.log("moving back", container.parent);
                                container = container.parent;
                                depth++;
                            }
                            if (depth - actualDepth > 1) {
                                // console.log('here');
                                var node = { parent: container, child: [] };
                                container.child.push(node);
                                container = node;
                            }
                        }
                        // console.log({ line: line, lastDepth: lastDepth, actualDepth: actualDepth, depth: depth});
                        if (!container) {
                            container = tree;
                        }
                        lastDepth = actualDepth;
                    } else {
                        container = tree;
                        lastDepth = 0;
                    }
                    container.child.push({ text: line });
                });
                //console.log(tree);
                $('.collapsible-text', this.$el).html(this.buildUL(tree.child));
                //console.log(this.buildUL(tree.child).wrap('p').parent().html());
                //console.log(this.buildUL(tree.child).html());
            }
        });

        return Views;
    });
