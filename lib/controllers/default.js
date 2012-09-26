(function () {
    
    module.exports = {
        
        setup: function (app) {
            app.get(/^\/$/, function (req, res) {
                res.render('index');
            });
            app.get(/^\/(?!assets|app)/, function (req, res) {
                res.render('index');
            });
        }
    
    };
})();