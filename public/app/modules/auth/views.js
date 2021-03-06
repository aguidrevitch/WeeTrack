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
                this.listenTo(app.global.user, 'sync', this.render);
                this.listenTo(app.global.workspace, 'sync', this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    workspace: app.global.workspace
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
                this.listenTo(app.global.workspace, 'sync', this.render);
                this.listenTo(app.global.workspaces, 'sync', this.render);
            },
            serialize: function () {
                return {
                    workspace: app.global.workspace,
                    workspaces: app.global.workspaces
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

                    window.location = location;
                } else {
                    app.router.navigate('/', { trigger: true });
                }
            }
        });

        Views.LoginForm = Backbone.Layout.extend({
            template: "auth/login-form",
            events: {
                "submit form": "login"
            },
            model: {},
            initialize: function () {
                this.listenTo(app, 'user:authorized', function () {
                    if (location.pathname.indexOf('/login') !== 0)
                        app.router.navigate(location.pathname, {trigger: true});
                    else
                        app.router.navigate('/', {trigger: true});
                });
            },
            login: function () {
                this.model = this.$el.find('form').serializeObject();
                app.global.user.authorize(this.model, {
                    error: _.bind(function (err) {
                        if (err._modal) {
                            $('.alert', this.$el).html(err._modal.message);
                            $('.alert', this.$el).alert();
                            $('.alert', this.$el).show();
                            setTimeout(function () {
                                $('.alert', this.$el).fadeOut('slow');
                            }, 2000);
                        }
                    }, this)
                });
                return false;
            },
            serialize: function () {
                return {
                    user: this.model
                };
            }
        });

        Views.RegisterForm = Backbone.Layout.extend({
            template: "auth/register",
            events: {
                "submit form": "register"
            },
            initialize: function () {
                this.listenTo(app, 'user:authorized', function () {
                    app.router.navigate('/workspace/add', { trigger: true });
                });
            },
            showModal: app.showModal,
            register: function (e) {
                this.model.save(this.$el.find('form').serializeObject(), {
                    error: _.bind(app.views.defaultErrorHandler, this)
                });
                return false;
            }
        });

        return Views;

    });
