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
            url: function () {
                return this.id ? '/api/project/' + this.id : '/api/project';
            }
        });

        var Projects = Backbone.Collection.extend({
            model: Project,
            url: function () {
                if (this.id)
                    return '/api/project/' + this.id;
                else if (this.workspace_id)
                    return '/api/project/?workspace=' + this.workspace_id;
                else
                    return '/api/project/';
            }
        });

        var Workspace = Backbone.Model.extend({
            idAttribute: "_id"
        });
        var Workspaces = Backbone.Collection.extend({
            model: Workspace,
            url: '/api/workspace'
        });

        Views.Layout = Backbone.Layout.extend({
            template: "project/layout",
            className: 'row',
            initialize: function () {

                this.workspaces = new Workspaces();
                this.workspaces.fetch();

                this.collection = new Projects();
                this.collection.fetch();

                this.setViews({
                    "#middle-sidebar": new Views.Info({
                        workspaces: this.workspaces
                    }),
                    "#left-sidebar": new Views.List({
                        collection: this.collection,
                        workspaces: this.workspaces
                    })
                });

                app.on('user:authorized', function () {
                    this.workspaces.fetch();
                    this.collection.fetch();
                }, this);

                app.on('user:deauthorized', function () {
                    this.workspaces.reset();
                    this.collection.reset();
                }, this);

                app.on('workspace:selected', function (id) {
                    console.log(id);
                });

                app.on("project:selected", function (id) {
                    var openedForm = this.getView('#middle-sidebar');

                    if (openedForm.model && id == openedForm.model.id)
                        return;

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate('project/' + id);
                                // existing project
                                var project = new Project({ _id: id });
                                this.setViews({
                                    "#middle-sidebar": new Views.Form({
                                        collection: this.collection,
                                        workspaces: this.workspaces,
                                        model: project
                                    })
                                });
                                project.fetch();
                            } else {
                                app.router.navigate('project/add');
                                // new project
                                this.setViews({
                                    "#middle-sidebar": new Views.Form({
                                        collection: this.collection,
                                        workspaces: this.workspaces,
                                        model: new Project()
                                    })
                                });
                                this.getView('#middle-sidebar').render();
                            }
                        }
                    }, this));
                }, this);

                app.on("project:deselected", function () {
                    this.setViews({
                        "#middle-sidebar": new Views.Info({
                            workspaces: this.workspaces
                        })
                    });
                    this.getView('#middle-sidebar').render();
                    app.router.navigate('project');
                }, this);

                if (this.options.project_id)
                    app.trigger('project:selected', this.options.project_id);
            },
            cleanup: function () {
                app.off("workspace:selected", null, this);
                app.off("workspace:deselected", null, this);
                app.off("project:selected", null, this);
                app.off("project:deselected", null, this);
            }
        });

        Views.Info = Backbone.Layout.extend({
            template: 'project/info',
            initialize: function () {
                this.workspaces = this.options.workspaces;
                this.workspaces.on('change', this.render, this);
            },
            serialize: function () {
                return {
                    workspaces: this.workspaces
                };
            },
            events: {
                'click .show-form': 'toggleForm'
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
                'click a': 'selected',
                'change select': 'workspaceChanged'
            },
            initialize: function () {
                this.workspaces = this.options.workspaces;
                this.workspaces.on("change", this.render, this);
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            serialize: function () {
                return {
                    projects: this.collection,
                    workspaces: this.workspaces
                };
            },
            cleanup: function () {
                this.collection.off('add', null, this);
                this.collection.off('reset', null, this);
            },
            workspaceChanged: function (e) {
                app.trigger('workspace:selected', $(e.target).val());
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

        Views.Form = Backbone.Layout.extend({
            template: "project/form",
            events: {
                'click .submit-form': 'saveProject',
                'click .close-form': 'closeForm'

            },
            initialize: function () {
                this.workspaces = this.options.workspaces;
                this.model.on('change', this.render, this);
                $(window).on('unload', this.closeForm, this);
            },
            cleanup: function () {
                $(window).off('unload', this.closeForm, this);
            },
            serialize: function () {
                var domain = window.location.hostname.replace(/.*(?:\.\w+\.\w+)/);
                return {
                    project: this.model,
                    domain: domain
                };
            },
            beforeRender: function () {
                this.workspaces.each(function (workspace) {
                    this.insertView("select", new Backbone.Layout({
                        tagName: 'option',
                        beforeRender: function () {
                            this.$el.append(workspace.escape('name'));
                            this.$el.attr('value', workspace.id);
                        }
                    }));
                }, this);
            },
            afterRender: function () {
                $("[name=name]").val(this.model.escape('name'));
                $("[name=subdomain]").val(this.model.escape('subdomain'));

                var select2options = {
                    placeholder: t("Search for a user"),
                    tokenSeparators: [' ', ',', ';'],
                    minimumInputLength: 1,
                    multiple: true,
                    quietMillis: 2000,
                    formatInputTooShort: function (term) {
                        return '';
                    },
                    formatNoMatches: function (term) {
                        return '';
                    },
                    formatSearching: function (term) {
                        return '';
                    },
                    query: function (query) {
                        var email = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                        var self = this;
                        var prev = $(self.element).data('prev') || '';
                        prev = prev.replace(/[(\[\]\.\*\?\^\$\\]/g, function (m) {
                            return '\\' + m;
                        });
                        var prevre = new RegExp('^' + prev, 'i');
                        if (prev && query.term.match(prevre)) {
                            $(this.element).data('prev', query.term);
                            if (query.term.match(email))
                                query.callback({results: [
                                    {id: query.term, text: query.term}
                                ]});
                            else
                                query.callback({results: []});
                        } else {
                            $.ajax({
                                url: "/api/user",
                                dataType: 'json',
                                data: { q: query.term },
                                success: function (data) {
                                    if (data.length) {
                                        _.each(data, function (v) {
                                            v.id = v._id;
                                            v.text = v.name ? v.name : v.email;
                                        });
                                        query.callback({results: data});
                                    } else {
                                        $(self.element).data('prev', query.term);
                                        if (query.term.match(email))
                                            query.callback({results: [
                                                {id: query.term, text: query.term}
                                            ]});
                                        else
                                            query.callback({results: []});
                                    }
                                }
                            });
                        }
                    }
                };

                var initSelection = function (element, callback) {
                    var users = [];
                    $.each(this, function (i, user) {
                        var data = { id: user._id };
                        data.text = user.name ? user.name : user.email;
                        users.push(data);
                    });
                    callback(users);
                };

                $("[name=administrators], [name=users], [name=clients]", this.$el).css({'opacity': 0});

                $("[name=administrators]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('administrators'))
                }));
                $("[name=users]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('users'))
                }));
                $("[name=clients]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('clients'))
                }));
                $("[name=administrators], [name=users], [name=clients]", this.$el).on('change', function (e) {
                    $(this).data('prev', '');
                });
                $("[name=administrators], [name=users], [name=clients]", this.$el).select2('val', []);
                $("[name=administrators], [name=users], [name=clients]", this.$el).css({'opacity': 1});

                if (this.justSaved) {
                    $('.alert', this.$el).alert();
                    $('.alert', this.$el).show();
                    setTimeout(function () {
                        $('.alert', this.$el).fadeOut('slow');
                    }, 2000);
                }

                $(':input', this.$el).filter(function () {
                    return !$(this).hasClass('select2-input');
                }).on('keyup', _.bind(function () {
                    this.isDirty = true;
                }, this));

                $("[name=administrators], [name=users], [name=clients]", this.$el).on('change', _.bind(function () {
                    this.isDirty = true;
                }, this));

                this.isDirty = false;
                this.justSaved = false;
            },
            saveProject: function () {
                var view = this;
                var isNew = this.model.isNew();
                var project = new Project({ _id: this.model.id });
                project.save(this.$el.find('form').serializeObject(), {
                    success: function (model) {
                        view.model = model;
                        view.justSaved = true;
                        view.render();
                        if (isNew)
                            view.collection.push(model);
                        app.router.navigate('project/' + model.id);
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
                            $(selector + ' + .error', self.el).html(t(value.message));
                        });
                    }
                });
                return false;
            },
            close: function (callback) {
                if (this.isDirty) {
                    app.showConfirm(t('Unsaved changes'), function (yes) {
                        callback(yes);
                    });
                } else {
                    callback(true);
                }
            },
            closeForm: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('project:deselected');
                });
            }
        });

        return Views;
    })
;
