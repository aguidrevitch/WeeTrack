define([
    "app",

    // Libs
    "backbone",
    "jquery",

    "modules/auth"
],

    function (app, Backbone, $, Auth) {

        var Views = {};

        Views.Tasks = Backbone.View.extend({
            template: "search/tasks",
            id: "tasks",
            projects: [],
            events: {
                'click .show-form': 'toggleForm',
                'click .close': 'toggleForm',
                'click .submit-form': 'addTask'
            },
            initialize: function () {
                this.collection.on("reset", this.niceRender, this);
                this.collection.on("add", this.niceRender, this);
                this.options.projects.on("reset", this.niceRender, this);
                this.options.projects.on("add", this.niceRender, this);
            },
            cleanup: function () {
                this.options.projects.off(null, null, this);
            },
            niceRender: function () {
                this.toggleForm(null, _.bind(this.render, this));
            },
            beforeRender: function () {
                this.collection.each(function (model) {
                    this.insertView("ul", new Views.Task({
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
                            $(selector + ' + .error', self.el).html(t(value.message));
                        });
                    }
                });
                return false;
            }
        });

        Views.Task = Backbone.View.extend({
            template: "search/task",
            tagName: 'li',
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
                        console.log(error.name.message);
                        $('#form-project-add [name=name]:input').tooltip({
                            trigger: 'manual',
                            title: t(error.name.message)
                        }).tooltip('show');
                        $('#form-project-add [name=name]:input').parents('.control-group').addClass('error');
                        setTimeout(function () {
                            $('#form-project-add [name=name]:input').parents('.control-group').removeClass('error');
                            $('#form-project-add [name=name]:input').tooltip('destroy');
                        }, 2000);
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
                'click .close': 'toggleForm',
                'click .submit-form': 'addComment'
            },
            initialize: function () {
                this.model.on('change', this.render, this);
            },
            afterRender: function () {

            },
            toggleForm: function () {
                $('form', this.$el).toggle('fast');
            },
            addComment: function () {

            },
            data: function () {
                return {
                    task: this.model
                };
            }
        });

        var Project = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/project'
        });

        var Projects = Backbone.Collection.extend({
            model: Project,
            url: '/api/project'
        });

        var Task = Backbone.Model.extend({
            idAttribute: "id",
            url: function () {
                return '/api/task/' + this.id
            }
        });

        var Tasks = Backbone.Collection.extend({
            model: Task,
            url: '/api/task'
        });

        var projects = new Projects();
        var tasks = new Tasks();
        var task = new Task();

        app.on('user:authorized', function () {
            tasks.fetch();
            projects.fetch();
        });

        app.on('user:deauthorized', function () {
            tasks.reset();
            projects.reset();
        });

        Views.Layout = Backbone.View.extend({
            template: "search/layout",
            className: 'row',
            views: {
                "#left-sidebar": new Views.Projects({
                    collection: projects
                }),
                "#middle-sidebar": new Views.Tasks({
                    collection: tasks,
                    projects: projects
                })
            },
            initialize: function () {
                if (this.options.taskId) {
                    task.id = this.options.taskId;
                    task.fetch();
                    this.setViews({
                        "#right-sidebar": new Views.TaskDetails({
                            model: task
                        })
                    });
                } else {
                    this.setViews({
                        "#right-sidebar": new Backbone.View({})
                    });
                }
            }
        });

        return Views;

    });
