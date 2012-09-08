define([
    "app",
    
    // Libs
    "backbone"
    ],
    
    function(app, Backbone) {
        
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
                return false;
            }
        });
        
        return Views;
    
    });
