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
            url: '/api/workspace'
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
                    "#left-sidebar": new Views.List({
                        collection: workspaces
                    })
                });
                app.on("workspace:selected", function (id) {
                    if (id && id != 'add') {
                        // existing workspace
                        var workspace = new Workspace({ _id: id });
                        workspace.fetch().done(_.bind(function () {
                            this.setViews({
                                "#middle-sidebar": new Views.Form({
                                    model: workspace
                                })
                            });
                            this.getView('#middle-sidebar').render();
                        }, this));
                    } else {
                        // new workspace
                        this.setViews({
                            "#middle-sidebar": new Views.Form({
                                model: new Workspace()
                            })
                        });
                        this.getView('#middle-sidebar').render();
                    }
                }, this);

                if (this.options.workspace_id)
                    app.trigger('workspace:selected', this.options.workspace_id)
            },
            cleanup: function () {
                app.off("workspace:selected", null, this);
            },
        });

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
            }
        });

        Views.Item = Backbone.LayoutView.extend({
            template: "workspace/item",
            tagName: 'li',
            data: function () {
                return {
                    workspace: this.model
                };
            }
        });

        Views.Form = Backbone.LayoutView.extend({
            template: "workspace/form",
            events: {
                'click .submit-form': 'addWorkspace'
            },
            data: function () {
                return {
                    workspace: this.model
                };
            },
            afterRender: function () {
                var email = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                var query = function (query) {
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
                            0 && query.callback({results: []});
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
                                        0 && query.callback({results: []});
                                }
                            }
                        });
                    }
                };

                $("[name=administrators], [name=users], [name=clients]", this.$el).select2({
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
                    query: query
                });
                $("[name=administrators], [name=users], [name=clients]", this.$el).on('change', function (e) {
                    $(this).data('prev', '');
                });

            },
            addWorkspace: function () {
                this.model.save(this.$el.find('form').serializeObject(), {
                    success: function (model) {
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
            }
        })
        ;

        app.on('user:authorized', function () {
            workspaces.fetch();
        });

        app.on('user:deauthorized', function () {
            //workspaces.reset();
        });

        return Views;
    })
;
