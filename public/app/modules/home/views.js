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
            template: "home/layout",
            className: 'row',
            initialize: function () {
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
                        model: new app.models.Task()
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
                                var task = new app.models.Task({ _id: id });
                                this.setViews({
                                    "#right-sidebar": new Views.Form({
                                        projects: this.projects,
                                        model: task
                                    })
                                });
                                task.fetch();
                            } else {
                                app.router.navigate('add');
                                // new project
                                this.setViews({
                                    "#right-sidebar": new Views.Form({
                                        projects: this.projects,
                                        model: new app.models.Task()
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

        Views.Info = Backbone.Layout.extend({
            template: 'home/info',
            close: function (callback) {
                callback(true);
            }
        });

        Views.Filter = Backbone.Layout.extend({
            template: 'home/filter'
        });

        Views.List = Backbone.Layout.extend({
            template: "home/list",
            id: "tasks",
            events: {
                'click .show-form': 'toggleForm',
            },
            initialize: function () {
                this.listenTo(this.collection, 'sync', this.render)
                this.listenTo(this.collection, 'add', this.render)
            },
            serialize: function () {
                return {
                    tasks: this.collection
                };
            },
            beforeRender: function () {
                this.collection.each(function (model) {
                    var view = new Views.Task({
                        model: model
                    });
                }, this);
            },
            toggleForm: function (e, callback) {
                app.router.navigate('add');
                return false;
            },
        });

        Views.Form = Backbone.Layout.extend({
            template: "home/form",
            events: {
                'click .submit-form': 'saveTask'
            },
            initialize: function () {
                this.projects = this.options.projects
            },
            serialize: function () {
                return {
                    projects: this.projects
                }
            },
            saveTask: function () {
                var view = this;
                var isNew = this.model.isNew();
                var task = new app.models.Task({ _id: this.model.id });
                task.save(this.$el.find('form').serializeObject(), {
                    success: function (model) {
                        view.model.set(model.attributes);
                        view.justSaved = true;
                        view.render();
                        if (isNew)
                            view.collection.push(model);
                        app.router.navigate('/' + model.id);
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
            }
        });

        Views.Task = Backbone.Layout.extend({
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
            serialize: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.Projects = Backbone.Layout.extend({
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

        Views.Project = Backbone.Layout.extend({
            template: "search/project",
            tagName: 'li',
            serialize: function () {
                return {
                    project: this.model
                };
            }
        });

        Views.UploadedFile = Backbone.Layout.extend({
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
            serialize: function () {
                return {
                    file: this.model
                };
            }
        });
        Views.TransactionForm = Backbone.Layout.extend({
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
            serialize: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.TaskDetails = Backbone.Layout.extend({
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
            serialize: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.Transaction = Backbone.Layout.extend({
            template: "search/transaction",
            tagName: 'li',
            serialize: function () {
                return {
                    transaction: this.model
                };
            }
        });

        /*
        app.on('user:authorized', function () {
            tasks.fetch();
            projects.fetch();
        });

        app.on('user:deauthorized', function () {
            tasks.reset();
            projects.reset();
        });
        */

        return Views;
    });
