define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash"
],

    function (app, Backbone, $, _) {

        var Views = {};

        Views.UserNavigation = Backbone.Layout.extend({
            tagName: 'ul',
            className: 'nav pull-right',
            template: "auth/user-navigation",
            initialize: function () {
                this.workspace = this.options.workspace;
                this.user = this.options.user;
                this.listenTo(this.user, 'sync', this.render);
                this.listenTo(this.workspace, 'sync', this.render);
            },
            serialize: function () {
                return {
                    user: this.user,
                    workspace: this.workspace
                };
            }
        });

        Views.WorkspaceNavigation = Backbone.Layout.extend({
            tagName: 'div',
            className: 'nav pull-right',
            template: 'auth/workspace-navigation',
            events: {
                'change select': 'highlightButton',
                'click .btn': 'changeWorkspace'
            },
            initialize: function () {
                this.workspace = this.options.workspace;
                this.workspaces = this.options.workspaces;
                this.listenTo(this.workspace, 'sync', this.render);
                this.listenTo(this.workspaces, 'sync', this.render);
            },
            serialize: function () {
                return {
                    workspace: this.workspace,
                    workspaces: this.workspaces
                };
            },
            highlightButton: function () {
                var workspace_id = $('select', this.$el).val();
                if (workspace_id != app.global.workspace.id) {
                    $('.btn', this.$el).addClass('btn-info');
                } else {
                    $('.btn', this.$el).removeClass('btn-info');
                }
            },
            changeWorkspace: function () {
                var workspace_id = $('select', this.$el).val();
                if (workspace_id != app.global.workspace.id) {
                    var subdomain = $('select option:selected', this.$el).data('subdomain');
                    var location = window.location.protocol + '//' + subdomain + '.' + hostname;

                    if (window.location.port) {
                        location += ':' + window.location.port;
                    }

                    /*if (window.location.pathname) {
                        var pathname = window.location.pathname.match(/^(\/[^\/]+)/);
                        if (pathname && pathname[1] &&
                            pathname[1] != '/add' &&
                            !pathname[1].match(/^\/\d+/)) {
                            location += pathname[1];
                        }
                    }*/

                    window.location = location;
                }
            }
        });

        Views.LoginForm = Backbone.Layout.extend({
            template: "auth/login-form",
            events: {
                "submit form": "login"
            },
            initialize: function () {
                this.listenTo(this.model, 'change', this.render);
            },
            login: function () {
                var data = this.$el.find('form').serializeObject();
                this.model.authorize(data, {
                    error: function (err) {
                        if (err._modal)
                            app.showModal(err._modal.message);
                    },
                    success: function () {
                        if (location.pathname.indexOf('/login') !== 0)
                            app.router.navigate(location.pathname, true);
                        //Backbone.history.loadUrl(location.pathname);
                        else
                            app.router.navigate('/search', true);
                    }
                });
                return false;
            }
        });

        Views.RegisterForm = Backbone.Layout.extend({
            template: "auth/register",
            events: {
                "submit form": "register"
            },
            register: function (e) {
                var self = this;
                var data = this.$el.find('form').serializeObject();
                self.model.set(data);
                self.model.save({}, {
                    error: function (model, res) {
                        var err;
                        try {
                            err = ($.parseJSON(res.responseText)).error;
                        } catch (e) {
                            return;
                        }

                        $(':input + .error', self.el).html('');
                        $(':input', self.el).parents('.control-group').removeClass('error');
                        _.each(err, function (value, field) {
                            var selector = '[name="' + field + '"]:input';
                            $(selector, self.el).parents('.control-group').addClass('error');
                            $(selector + ' + .error', self.el).html(t(value.message));
                        });
                    },
                    success: function (model) {
                        app.router.navigate('workspace/add', { trigger: true });
                    }
                });
                return false;
            }
        });

        return Views;

    });
