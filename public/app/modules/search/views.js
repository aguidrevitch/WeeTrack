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

        var Project = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/project'
        });

        var Projects = Backbone.Collection.extend({
            model: Project,
            url: '/api/project'
        });

        var Transaction = Backbone.Model.extend({
            url: '/api/transaction'
        });

        var Transactions = Backbone.Collection.extend({
            url: '/api/transaction',
            model: Transaction
        });

        var Task = Backbone.Model.extend({
            idAttribute: "id",
            url: function () {
                return this.id ? '/api/task/' + this.id : '/api/task';
            },
            initialize: function (attributes) {
                this.transactions = new Transactions();
                if (attributes && attributes.transactions)
                    this.transactions.reset(attributes.transactions);
            },
            parse: function (response) {
                if (!this.transactions)
                    this.transactions = new Transactions();
                this.transactions.reset(response.transactions);
                delete response.transactions;
                return response;
            }
        });

        var Tasks = Backbone.Collection.extend({
            model: Task,
            url: '/api/task'
        });

        var projects = new Projects();
        var tasks = new Tasks();
        var task = new Task();

        Views.Tasks = Backbone.View.extend({
            template: "search/tasks",
            id: "tasks",
            events: {
                'click .show-form': 'toggleForm',
                'click form .close': 'toggleForm',
                'click .submit-form': 'addTask'
            },
            data: function () {
                return {
                    projects: this.options.projects
                };
            },
            initialize: function () {
                this.collection.on("reset", this.niceRender, this);
                this.collection.on("add", this.niceRender, this);
                this.options.projects.on("reset", this.render, this);
                this.options.projects.on("add", this.render, this);
            },
            cleanup: function () {
                this.options.projects.off(null, null, this);
            },
            niceRender: function () {
                $('form', this.$el).hide('fast', _.bind(this.render, this));
            },
            beforeRender: function () {
                this.collection.each(function (model) {
                    this.insertView("table", new Views.Task({
                        model: model
                    }));
                }, this);
                $('select', this.$el).html('');
                this.options.projects.each(function (project) {
                    this.insertView('select', new Backbone.View({
                        append: function (root, child) {
                            $(root).append('<option value="' + project.id + '">' + project.escape('name') + '</option>');
                        }
                    }));
                }, this);
            },
            setSelectedTask: function (model) {
                if (this.selectedTask != model && this.selectedTask)
                    this.selectedTask.trigger('deselected');

                if (model)
                    model.trigger('selected');

                this.selectedTask = model;

                if (this.selectedTask) {
                    $('#middle-sidebar').removeClass('span10');
                    $('#middle-sidebar').addClass('span5');
                } else {
                    $('#middle-sidebar').addClass('span10');
                    $('#middle-sidebar').removeClass('span5');
                }
            },
            initDisplay: function () {
                if (this.selectedTask) {
                    $('#middle-sidebar').removeClass('span10');
                    $('#middle-sidebar').addClass('span5');
                    this.getView(
                        _.bind(function (view) {
                            if (view.model == this.selectedTask) {
                                console.log(view.$el.offset().top);
                                setTimeout(function () {
                                    $('#tasks').scrollTop(0);
                                    $('#tasks').scrollTop(view.$el.offset().top - 60);
                                }, 0);
                            }
                        }, this));
                } else {
                    $('#middle-sidebar').addClass('span10');
                    $('#middle-sidebar').removeClass('span5');
                }
            },
            toggleForm: function (e, callback) {
                $('form', this.$el).toggle('fast', callback);
            },
            addTask: function () {
                var self = this;
                var task = new this.collection.model();
                task.save(Backbone.Syphon.serialize(this), {
                    success: function (model) {
                        self.collection.push(model);
                    },
                    error: function (model, res) {
                        var err = ($.parseJSON(res.responseText)).error;
                        $(':input + .error', self.el).html('');
                        $(':input', self.el).parents('.control-group').removeClass('error');
                        _.each(err, function (value, field) {
                            var selector = '[name="' + field + '"]:input';
                            $(selector, self.el).parents('.control-group').addClass('error');
                            $(selector, self.el).tooltip({
                                trigger: 'focus',
                                title: t(value.message)
                            }).tooltip();
                            $(selector, self.el).on('keyup', function () {
                                $(selector, self.el).parents('.control-group').removeClass('error');
                                $(selector, self.el).tooltip('destroy');
                            });
                        });
                    }
                });
                return false;
            }
        });

        Views.Task = Backbone.View.extend({
            template: "search/task",
            tagName: 'tr',
            beforeRender: function () {

                this.model.on('selected', function () {
                    app.router.navigate('search/' + this.model.id, true);
                    this.$el.addClass('success');
                }, this);

                this.model.on('deselected', function () {
                    this.$el.removeClass('success');
                }, this);

                this.$el.on('click', _.bind(function () {
                    Views_Tasks.setSelectedTask(this.model);
                }, this));
            },
            afterRender: function () {
                if (this.model.id == task.id)
                    Views_Tasks.setSelectedTask(this.model);
            },
            data: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.Projects = Backbone.View.extend({
            template: 'search/projects',
            id: "projects",
            events: {
                'click .show-form': 'toggleForm',
                'click .submit-form': 'addProject'
            },
            initialize: function () {
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            beforeRender: function () {
                this.collection.each(function (model) {
                    this.insertView("ul", new Views.Project({
                        model: model
                    }));
                }, this);
            },
            toggleForm: function () {
                $('form', this.$el).toggle('fast');
            },
            addProject: function () {
                var self = this;
                var project = new this.collection.model();
                project.save(Backbone.Syphon.serialize(this), {
                    success: function (project) {
                        self.collection.push(project);
                    },
                    error: function (object, res) {
                        var error = ($.parseJSON(res.responseText)).error;
                        $('#form-project-add [name=name]:input').tooltip({
                            trigger: 'focus',
                            title: t(error.name.message)
                        }).tooltip('show');
                        $('#form-project-add [name=name]:input').parents('.control-group').addClass('error');

                        $('#form-project-add [name=name]:input').on('keyup', function () {
                            $('#form-project-add [name=name]:input').parents('.control-group').removeClass('error');
                            $('#form-project-add [name=name]:input').tooltip('destroy');
                        });

                    }
                });
                return false;
            }
        });

        Views.Project = Backbone.View.extend({
            template: "search/project",
            tagName: 'li',
            data: function () {
                return {
                    project: this.model
                };
            }
        });

        Views.TaskDetails = Backbone.View.extend({
            template: "search/task-details",
            id: 'task-details',
            events: {
                'click .show-form': 'toggleForm',
                'click #task-header .close': 'close',
                'click form .close': 'toggleForm',
                'click .submit-form': 'addComment'
            },
            initialize: function () {
                this.model.on('change', this.render, this);
                this.model.transactions.on('reset', this.render, this);
                this.model.transactions.on('add', this.render, this);
            },
            beforeRender: function () {
                this.model.transactions.each(function (model) {
                    this.insertView("ul", new Views.Transaction({
                        model: model
                    }));
                }, this);
            },
            afterRender: function () {
                $('#form-transaction-add [name=content]:input').on('keyup', function () {
                    $('#form-transaction-add [name=content]:input').parents('.control-group').removeClass('error');
                    $('#form-transaction-add [name=content]:input').tooltip('destroy');
                });
            },
            toggleForm: function () {
                $('form', this.$el).toggle('fast');
            },
            close: function () {
                Views_Tasks.setSelectedTask();
                app.router.navigate('/search', true);
            },
            addComment: function () {
                var self = this;
                var transaction = new Transaction();
                transaction.save(Backbone.Syphon.serialize(this), {
                    success: function (transaction) {
                        self.model.transactions.push(transaction);
                    },
                    error: function (object, res) {
                        var error = ($.parseJSON(res.responseText)).error;
                        if (error.content) {
                            $('#form-transaction-add [name=content]:input').tooltip({
                                trigger: 'focus',
                                title: t(error.content.message)
                            }).tooltip('show');
                            $('#form-transaction-add [name=content]:input').parents('.control-group').addClass('error');
                        }

                        if (error._modal) {
                            app.showModal(error._modal.message);
                        }
                    }
                });
                return false;
            },
            data: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.Transaction = Backbone.View.extend({
            template: "search/transaction",
            tagName: 'li',
            data: function () {
                return {
                    transaction: this.model
                };
            }
        });

        var Views_Project = new Views.Projects({
            collection: projects
        });

        var Views_Tasks = new Views.Tasks({
            collection: tasks,
            projects: projects
        });

        var Views_TaskDetails = new Views.TaskDetails({
            model: task
        });

        Views.Layout = Backbone.View.extend({
            template: "search/layout",
            className: 'row',
            views: {
                "#left-sidebar": Views_Project,
                "#middle-sidebar": Views_Tasks,
                "#right-sidebar": Views_TaskDetails
            },
            afterRender: function () {
                Views_Tasks.initDisplay();
            },
            setTaskId: function (id) {
                if (id) {
                    task.id = id;
                    task.fetch()
                        .error(function (res) {
                            var error = ($.parseJSON(res.responseText)).error;
                            app.showModal(error._modal.message);
                        });
                } else {
                    task.clear();
                }
            }
        });

        app.on('user:authorized', function () {
            tasks.fetch();
            projects.fetch();
        });

        app.on('user:deauthorized', function () {
            tasks.reset();
            projects.reset();
        });

        return Views;
    });
