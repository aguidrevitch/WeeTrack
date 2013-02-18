(function () {

    var User = require("../../models/user");

    module.exports = {
        setup: function (app, authorizedOnly) {

            /* login */
            app.get('/api/user', authorizedOnly, function (req, res) {
                    var q = req.param('q').replace(/[(\[\]\.\*\?\^\$\\]/g, function (m) {
                        return '\\' + m;
                    });
//                console.log(require('util').inspect({
//                    $and: {
//                        $or: [
//                            { email: new RegExp('^' + q, "i") },
//                            { name: new RegExp(q, "i") }
//                        ],
//                        visibility: {
//                            $in: req.user.visibility || []
//                        }
//                    }
//                }, true, 99));

                    User.find({
                            $and: [
                                {
                                    $or: [
                                        { email: new RegExp('^' + q, "i") },
                                        { name: new RegExp(q, "i") }
                                    ]
                                },
                                {
                                    visibility: {
                                        $in: req.user.visibility || []
                                    }
                                }
                            ]
                        },
                        {_id: 1, name: 1, email: 1},
                        { limit: 10 },
                        function (err, result) {
                            if (err)
                                res.modal(err)
                            else
                                res.json(result)
                        });
                }
            )
            ;
        }
    }
    ;

})
    ();