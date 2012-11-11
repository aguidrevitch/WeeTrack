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

        Views.Tasks = Backbone.LayoutView.extend({
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
                this.options.projects.on("reset", this.niceRender, this);
                this.options.projects.on("add", this.niceRender, this);
                var selectedView;
                app.on("task:selected", function (view, scroll) {
                    if (scroll)
                        this.selectedTask = view;
                    if (selectedView)
                        selectedView.trigger('deselected');
                    if (view)
                        view.trigger('selected');
                    selectedView = view;
                }, this);
            },
            cleanup: function () {
                app.off("task:selected", null, this);
                this.options.projects.off(null, null, this);
            },
            niceRender: function () {
                if ($('form', this.$el).is(':visible')) {
                    $('form', this.$el).hide('fast', _.bind(this.render, this));
                } else {
                    this.render();
                }
            },
            beforeRender: function () {
                var count = this.collection.length;
                this.collection.each(function (model) {
                    var view = new Views.Task({
                        model: model
                    });
                    view.on("afterRender", function () {
                        count--;
                        if (count == 0 && this.selectedTask) {
                            $('#tasks').scrollTop(0);
                            $('#tasks').scrollTop(this.selectedTask.$el.offset().top - 120);
                        }
                    }, this);
                    this.insertView("table", view);
                }, this);
            },
            afterRender: function () {
                $('select', this.$el).html('');
                this.options.projects.each(function (project) {
                    this.insertView('select', new Backbone.LayoutView({
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

        Views.Task = Backbone.LayoutView.extend({
            template: "search/task",
            tagName: 'tr',
            cleanup: function () {
                this.destroyed = true;
            },
            afterRender: function () {
                if (!this.destroyed) {
                    this.on('selected', function () {
                        this.$el.addClass('success');
                    }, this);
                    this.on('deselected', function () {
                        this.$el.removeClass('success');
                    }, this);
                    this.$el.on('click', _.bind(function () {
                        app.router.navigate('search/' + this.model.id);
                        app.trigger('task:selected', this);
                    }, this));
                    if (this.model.id == task.id)
                        app.trigger('task:selected', this, true);
                }
            },
            data: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.Projects = Backbone.LayoutView.extend({
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

        Views.Project = Backbone.LayoutView.extend({
            template: "search/project",
            tagName: 'li',
            data: function () {
                return {
                    project: this.model
                };
            }
        });

        Views.UploadedFile = Backbone.LayoutView.extend({
            template: "search/uploaded-file",
            keep: true,
            initialize: function () {
                var self = this;
                this.options.jqXHR.error(function (jqXHR, textStatus, errorThrown) {
                    console.log(arguments);
                    var progress = self.$el.find('.upload-progress span');
                    if (errorThrown == 'abort')
                        progress.text(t(errorThrown));
                    else
                        progress.text(t('error'));
                    progress.removeClass('label-info').addClass('label-important');
                    self.$el.find('.upload-close').off('click');
                    self.$el.find('.upload-close').on('click', function () {
                        self.remove();
                    });
                });
            },
            afterRender: function () {
                var self = this
                this.$el.find('.upload-close').on('click', function () {
                    self.options.jqXHR.abort();
                });
            },
            onUploadProgress: function (data) {
                this.$el.find('.upload-progress span').html(parseInt(data.loaded / data.total * 100, 10) + "%");
            },
            onUploadDone: function (data) {
                this.$el.find('.upload-progress span').text("done").removeClass('label-info').addClass('label-success');
                var self = this;
                this.$el.find('.upload-close').off('click');
                _.each(data.files, function (file, index) {
                    if (file.name == self.model.name)
                        self.$el.find('.upload-close').on('click', function () {
                            $.ajax({
                                type: 'DELETE',
                                url: data.result[index].delete_url,
                                success: function () {
                                    self.remove();
                                }
                            });
                        });
                });
            },
            data: function () {
                return {
                    file: this.model
                }
            }
        });

        Views.TaskDetails = Backbone.LayoutView.extend({
            template: "search/task-details",
            id: 'task-details',
            events: {
                'click .show-form': 'toggleForm',
                'click #task-header .close': 'close',
                'click form .close-form': 'toggleForm',
                'click .submit-form': 'addComment'
            },
            initialize: function () {
                //this.model.on('change', this.render, this);
                //this.model.transactions.on('reset', this.render, this);
                //this.model.transactions.on('add', this.render, this);
            },
            cleanup: function () {
                this.model.transactions.off('reset', null, null);
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

                var self = this;
                var uploads = {};

                $('#fileupload').fileupload({ dataType: 'json',
                    add: function (e, data) {
                        _.each(data.files, function (file) {
                            var view = uploads[file.name] = new Views.UploadedFile({
                                model: file,
                                jqXHR: data.submit()
                            });
                            self.insertView("#upload-progress", view).render();
                        }, this);
                        /*
                         var jqXHR = data.submit()
                         .success(function (result, textStatus, jqXHR) {

                         })
                         .error(function (jqXHR, textStatus, errorThrown) {
                         })
                         .complete(function (result, textStatus, jqXHR) {
                         });
                         */
                    }
                });

                $('#fileupload').bind('fileuploadprogress', function (e, data) {
                    _.each(data.files, function (file) {
                        uploads[file.name].onUploadProgress(data);
                    });
                });

                $('#fileupload').bind('fileuploaddone', function (e, data) {
                    _.each(data.files, function (file) {
                        uploads[file.name].onUploadDone(data);
                    });
                });

            },
            toggleForm: function () {
                $('form', this.$el).toggle('fast');
            },
            close: function () {
                app.trigger('task:selected');
                app.router.navigate('/search');
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

        Views.Transaction = Backbone.LayoutView.extend({
            template: "search/transaction",
            tagName: 'li',
            data: function () {
                return {
                    transaction: this.model
                };
            }
        });

        Views.Layout = Backbone.LayoutView.extend({
            template: "search/layout",
            className: 'row',
            initialize: function () {
                this.setViews({
                    "#left-sidebar": new Views.Projects({
                        collection: projects
                    }),
                    "#middle-sidebar": new Views.Tasks({
                        collection: tasks,
                        projects: projects
                    })
                });
                app.on("task:selected", function (view) {
                    if (view) {
                        this.setViews({
                            "#right-sidebar": new Views.TaskDetails({
                                model: view.model
                            })
                        });
                        this.getView('#right-sidebar').render();
                        $('#middle-sidebar').removeClass('span10');
                        $('#middle-sidebar').addClass('span5');
                    } else {
                        $('#middle-sidebar').addClass('span10');
                        $('#middle-sidebar').removeClass('span5');
                    }
                }, this);

                if (this.options.task_id)
                    task.id = this.options.task_id;
            },
            cleanup: function () {
                app.off("task:selected", null, this);
            },
            afterRender: function () {
                // task:selected can fire before view is actually rendered
                // so we must re-render #middle-sidebar and re-fire task:selected
                this.getView('#middle-sidebar').render();
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
