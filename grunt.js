module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib');
    grunt.loadNpmTasks('bbb');
    grunt.file.setBase("public");
    grunt.loadTasks('public');

    grunt.registerTask("development", function () {
        process.env.NODE_ENV = 'development';
        require('./server');
    });

    grunt.registerTask("staging", function () {
        grunt.tasks("release", {}, function () {
            process.env.NODE_ENV = 'staging';
            require('./server');
        });
    });

    grunt.registerTask("production", function () {
        grunt.tasks("release", {}, function () {
            process.env.NODE_ENV = 'production';
            require('./server');
        });
    });

    grunt.registerTask("default", "development");

};
