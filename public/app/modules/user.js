define([
    // Application.
    "app",
    
    // Views
    "modules/user/views"
    ],
    
    function(app, Views) {
        
        var User = app.module();
        
        User.Model = Backbone.Model.extend({
            url: '/api/user'
        });
        
        User.Collection = Backbone.Collection.extend({
            model: User.Model
        });
        
        var Router = Backbone.Router.extend({
            routes: {}
        });
        
        User.Router = new Router();
        
        // Return the module for AMD compliance.
        return User;
    
    });
