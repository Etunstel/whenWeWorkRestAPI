var express = require('express');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database'); // get db config file
var User = require('../app/models/user'); // get the mongoose model
var Shift = require('../app/models/schedule');
var jwt = require('jwt-simple');
var SchedFunctions = require('../app/functions/scheduleFun.js');

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Custom-Header");
    res.header("Access-Control-Allow-Methods", "POST");
    next();
});

module.exports = function (apiRoutes) {

    //Route for users to signup
    apiRoutes.options('/signup', cors());
    apiRoutes.post('/signup', function (req, res) {
        if (!req.body.firstName || !req.body.password) {
            res.json({
                success: false,
                msg: 'Please add name and password.'
            });
        } else {
            var newUser = new User({
                role: 'student',
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                password: req.body.password,
                email: req.body.email
            });
            // save the user
            newUser.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.json({
                        success: false,
                        msg: 'Username already exists.'
                    });
                }
                res.json({
                    success: true,
                    msg: 'Successful created new user.'
                });
            });
        }
    });

    //route to authenticate a user (POST http://localhost:8080/api/authenticate)
    apiRoutes.options('/authenticate', cors());
    apiRoutes.post('/authenticate', function (req, res) {
        User.findOne({
            email: req.body.email
        }, function (err, user) {
            if (err) console.log(err);

            if (!user) {
                res.send({
                    success: false,
                    msg: 'Authentication failed. User not found.'
                });
            } else {
                // check if password matches
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (isMatch && !err) {
                        // if user is found and password is right create a token
                        var token = jwt.encode(user, config.secret);
                        // return the information including token as JSON
                        res.json({
                            success: true,
                            token: 'JWT ' + token
                        });
                    } else {
                        res.send({
                            success: false,
                            msg: 'Authentication failed. Wrong password.'
                        });
                    }
                });
            }
        });
    });

    // route to a restricted info (GET)
    apiRoutes.options('/memberinfo', cors());
    apiRoutes.get('/memberinfo', passport.authenticate('jwt', {
        session: false
    }), function (req, res) {
        var token = getToken(req.headers);
        if (token) {
            var decoded = jwt.decode(token, config.secret);
            User.findOne({
                email: decoded.email
            }, function (err, user) {
                if (err) throw err;

                if (!user) {
                    return res.status(403).send({
                        success: false,
                        msg: 'Authentication failed. User not found.'
                    });
                } else {
                    res.json({
                        success: true,
                        msg: 'Welcome in the member area ' + user.firstName + '!',
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email
                    });
                }
            });
        } else {
            return res.status(403).send({
                success: false,
                msg: 'No token provided.'
            });
        }
    });



}
