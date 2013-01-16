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

        var Workspace = Backbone.Model.extend({
            idAttribute: "_id",
            url: function () {
                //console.log(this, this.id);
                return this.id ? '/api/workspace/' + this.id : '/api/workspace';
            }
        });

        var Workspaces = Backbone.Collection.extend({
            model: Workspace,
            url: '/api/workspace'
        });

        var workspaces = new Workspaces();

        Views.Layout = Backbone.LayoutView.extend({
            template: "workspace/layout",
            className: 'row',
            initialize: function () {
                this.setViews({
                    "#middle-sidebar": new Views.Info(),
                    "#left-sidebar": new Views.List({
                        collection: workspaces
                    })
                });
                app.on("workspace:selected", function (id) {
                    if (id && id != 'add') {
                        app.router.navigate('workspace/' + id);
                        // existing workspace
                        var workspace = new Workspace({ _id: id });
                        this.setViews({
                            "#middle-sidebar": new Views.Form({
                                model: workspace
                            })
                        });
                        //this.getView("#middle-sidebar").render();
                        workspace.fetch();
                    } else {
                        app.router.navigate('workspace/add');
                        // new workspace
                        this.setViews({
                            "#middle-sidebar": new Views.Form({
                                model: new Workspace()
                            })
                        });
                        this.getView('#middle-sidebar').render();
                    }
                }, this);

                app.on("workspace:deselected", function () {
                    this.setViews({
                        "#middle-sidebar": new Views.Info()
                    });
                    this.getView('#middle-sidebar').render();
                }, this);

                if (this.options.workspace_id)
                    app.trigger('workspace:selected', this.options.workspace_id)
            },
            cleanup: function () {
                app.off("workspace:selected", null, this);
            },
        });

        Views.Info = Backbone.LayoutView.extend({
            template: 'workspace/info'
        })

        Views.List = Backbone.LayoutView.extend({
            template: 'workspace/list',
            id: "workspaces",
            events: {
                'click .show-form': 'toggleForm'
            },
            initialize: function () {
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            cleanup: function () {
                this.collection.off('add', null, this);
                this.collection.off('reset', null, this);
            },
            beforeRender: function () {
                this.collection.each(function (model) {
                    this.insertView("ul", new Views.Item({
                        model: model
                    }));
                }, this);
            },
            toggleForm: function () {
                app.trigger('workspace:selected');
                return false;
            }
        });

        Views.Item = Backbone.LayoutView.extend({
            template: "workspace/item",
            tagName: 'li',
            events: {
                'click a': 'selected'
            },
            data: function () {
                return {
                    workspace: this.model
                };
            },
            selected: function () {
                app.trigger('workspace:selected', this.model.id);
                return false;
            }
        });

        Views.Form = Backbone.LayoutView.extend({
            template: "workspace/form",
            events: {
                'click .submit-form': 'saveWorkspace',
                'click .close-form': 'closeForm'

            },
            initialize: function () {
                this.model.on('change', function () {
                    console.log(this.model);
                    this.render();
                }, this);
            },
            data: function () {
                return {
                    workspace: this.model
                };
            },
            afterRender: function () {
                //console.log(this.model);

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
                        var email = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
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
                                            v.text = v.name ? v.name : v.email
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
            },
            saveWorkspace: function () {
                var view = this;
                var isNew = this.model.isNew()
                var workspace = new Workspace();
                workspace.save(this.$el.find('form').serializeObject(), {
                    success: function (model) {
                        view.model = model;
                        view.render();
                        if (isNew)
                            workspaces.push(model);
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
                    },
                });
                return false;
            },
            closeForm: function () {
                this.remove();
                app.trigger('workspace:deselected');
            }
        })
        ;

        app.on('user:authorized', function () {
            workspaces.fetch();
        });

        app.on('user:deauthorized', function () {
            workspaces.reset();
        });

        return Views;
    })
;
