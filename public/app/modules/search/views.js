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
        var TASK_ID;

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
                        if (count === 0 && this.selectedTask) {
                            $('#tasks').scrollTop(0);
                            $('#tasks').scrollTop(this.selectedTask.$el.offset().top - 120);
                        }
                    }, this);
                    this.insertView("table", view);
                }, this);

                this.options.projects.each(function (project) {
                    this.insertView('select', new Backbone.LayoutView({
                        tagName: 'option',
                        beforeRender: function () {
                            this.$el.append(project.escape('name'));
                            this.$el.attr('value', project.id);
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
                task.save(this.$el.find('form').serializeObject(), {
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
                    if (this.model.id == TASK_ID)
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
                project.save(this.$el.find('form').serializeObject(), {
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
                var self = this;
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
                    if (file.name == self.model.name) {
                        //console.log(data.result[index]);
                        self.$el.append('<input type="hidden" name="upload" value="' + data.result[index].name + '">');
                        if (data.result[index].thumbnail_url) {
                            var thumbnail = new Image();
                            thumbnail.onload = function () {
                                self.$el.tooltip({
                                    html: true,
                                    title: '<img src="' + thumbnail.src + '">',
                                    trigger: 'hover',
                                    placement: 'left'
                                });
                            };
                            thumbnail.src = data.result[index].thumbnail_url;
                        }
                        self.$el.find('.upload-close').on('click', function () {
                            self.$el.tooltip('destroy');
                            $.ajax({
                                type: 'DELETE',
                                url: data.result[index].delete_url,
                                success: function () {
                                    self.remove();
                                }
                            });
                        });
                    }
                });
            },
            data: function () {
                return {
                    file: this.model
                };
            }
        });
        Views.TransactionForm = Backbone.LayoutView.extend({
            template: "search/transaction-form",
            events: {
                'click form .close-form': 'toggleForm',
                'click .submit-form': 'addTransaction'
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
            addTransaction: function () {
                var self = this;

                var form = this.$el.find('form');
                var save = function (options) {
                    options.task = self.model.id;
                    var transaction = new Transaction();
                    var deferred = new $.Deferred();
                    transaction.save(options, {
                        success: function (transaction) {
                            self.model.transactions.push(transaction);
                            deferred.resolve();
                        },
                        error: function (object, res) {
                            var error = ($.parseJSON(res.responseText)).error;
                            if (error._modal) {
                                app.showModal(error._modal.message);
                            } else {
                                _.each(error, function (value, key) {
                                    form.find('[name=' + key + ']:input').tooltip({
                                        trigger: 'focus',
                                        title: t(value.message)
                                    }).tooltip('show');
                                    setTimeout(function () {
                                        form.find('[name=' + key + ']:input').tooltip('hide');
                                    }, 2000);
                                    form.find('[name=' + key + ']:input').parents('.control-group').addClass('error');
                                });
                            }
                            deferred.fail();
                        }
                    });
                    return deferred.promise();
                };

                var serialized = form.serializeObject();
                var type = 'reply';

                var counter = 1;
                var saved = function () {
                    if (!--counter)
                        self.toggleForm();
                };

                /* saving content */
                if (serialized.content) {
                    counter++;
                    save({
                        type: type,
                        subtype: 'text',
                        content: serialized.content
                    }).done(saved);
                }

                /* saving uploaded files */
                if (serialized.upload) {
                    form.find('[name=upload]').each(function (index, element) {
                        counter++;
                        save({
                            type: type,
                            subtype: 'file',
                            filename: $(element).val()
                        }).done(saved);
                    });
                }
                saved();
                return false;
            },
            toggleForm: function () {
                $('form', this.$el).toggle('fast');
            },
            data: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.TaskDetails = Backbone.LayoutView.extend({
            template: "search/task-details",
            id: 'task-details',
            events: {
                'click .show-form': 'toggleForm',
                'click #task-header .close-details': 'close'
            },
            initialize: function () {
                // this.model.on('change', this.render, this);
                this.model.transactions.on('add', this.render, this);
            },
            cleanup: function () {
                this.model.transactions.off('add', null, null);
                //this.model.off('change', null, null);
            },
            beforeRender: function () {
                this.model.transactions.each(function (model) {
                    this.insertView("ul", new Views.Transaction({
                        model: model
                    }));
                }, this);
                this.form = this.insertView('.form-fixed', new Views.TransactionForm({
                    model: this.model,
                    append: function(root, child) {
                        $(root).prepend(child);
                    }
                }));
            },
            afterRender: function () {
                $('a[thumbnail_url]', this.$el).each(function () {
                    var self = $(this);
                    var thumbnail = new Image();
                    thumbnail.onload = function () {
                        self.tooltip({
                            html: true,
                            title: '<img src="' + thumbnail.src + '">',
                            trigger: 'hover',
                            placement: 'left'
                        });
                    };
                    thumbnail.src = $(this).attr('thumbnail_url');
                });
            },
            close: function () {
                app.trigger('task:selected');
                app.router.navigate('/search');
                this.remove();
            },
            toggleForm: function () {
                this.form.toggleForm();
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
                        var task = new Task({ id: view.model.id });
                        task.fetch().done(_.bind(function () {
                            this.setViews({
                                "#right-sidebar": new Views.TaskDetails({
                                    model: task
                                })
                            });
                            this.getView('#right-sidebar').render();
                        }, this));
                        $('#middle-sidebar').removeClass('span10');
                        $('#middle-sidebar').addClass('span5');
                    } else {
                        $('#middle-sidebar').addClass('span10');
                        $('#middle-sidebar').removeClass('span5');
                    }
                }, this);

                if (this.options.task_id)
                    TASK_ID = this.options.task_id;
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
