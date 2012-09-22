define([
    "app",
    
    // Libs
    "backbone",
    "jquery"
    ],
    
    function(app, Backbone, $) {
        
        var Views = {};
        
        Views.Navigation = Backbone.View.extend({
            template: "auth/navigation",
            initialize: function () {
                this.model.on('change', this.render, this);
            },
            serialize: function () {
                return {
                    user: this.model
                };
            }
        });
        
        Views.LoginForm = Backbone.View.extend({
            template: "auth/login-form",
            events: {
                "submit form" : "login"
            },
            initialize: function () {
                this.model.on('change', this.render, this);
            },
            login: function () {
                var data = Backbone.Syphon.serialize(this);
                this.model.authorize(data, {
                    error: function (err) {
                        if (err._modal) 
                            app.showModal(err._modal.message);
                    },
                    success: function () {
                        if (location.pathname.indexOf('/login') !== 0)
                            Backbone.history.loadUrl(location.pathname);
                        else
                            app.router.navigate('/', true);
                    }
                });
                return false;
            }
        });
        
        Views.RegisterForm = Backbone.View.extend({
            template: "auth/register-form",
            
            events: {
                "submit form" : "register"
            },
            
            register: function (e) {
                var self = this;
                var data = Backbone.Syphon.serialize(this);
                self.model.set(data);
                self.model.save({}, {
                    error: function (model, res) {
                        var err;
                        try {
                            err = ($.parseJSON(res.responseText)).error;
                        } catch (e) { 
                            return;
                        }
                        
                        $( ':input + .error', self.el).html('');
                        $( ':input', self.el).parents('.control-group').removeClass('error');
                        _.each(err, function (value, field) {
                            var selector = '[name="' + field + '"]:input';
                            $( selector, self.el).parents('.control-group').addClass('error');
                            $( selector + ' + .error', self.el).html(value.message);
                        });
                    },
                    success: function (model) {
                        app.useLayout("main").setViews({
                            "section": new Views.RegisterSuccess({
                                model: model
                            })
                        }).render();
                    }
                });
                return false;
            }
        });
        
        Views.RegisterSuccess = Backbone.View.extend({
            template: "auth/register-success",
            serialize: function () {
                return {
                    user: this.model
                };
            }
        });
        
        return Views;
    
    });
