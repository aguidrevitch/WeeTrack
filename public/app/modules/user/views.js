define([
    "app",
    
    // Libs
    "backbone",
    "jquery"
    ],
    
    function(app, Backbone, $, Syphon) {
        
        var Views = {};
        
        Views.Navigation = Backbone.View.extend({
            template: "user/navigation",
            serialize: function () {
                return {
                    user: null
                };
            }
        });
        
        Views.LoginForm = Backbone.View.extend({
            template: "user/login-form",
            events: {
                "submit form" : "login"
            },
            login: function (e) {
                return false;
            }
        });
        
        Views.RegisterForm = Backbone.View.extend({
            template: "user/register-form",
            
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
                            $( selector + ' + .error', self.el).html(value.type);
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
            template: "user/register-success",
            serialize: function () {
                return {
                    user: this.model.toJSON()
                };
            }
        });
        
        return Views;
    
    });
