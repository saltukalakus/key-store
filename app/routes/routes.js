var Token       = require('../models/tokenModel');

module.exports = function(app, passport) {

// Normal routes ===============================================================
	// Show the home page (will also have our login links)
	app.get('/', function(req, res) {
        if (req.isAuthenticated())
            res.redirect('/profile');

        res.header('status', 'logout');
		res.render('login.html');
	});

	// PROFILE SECTION =========================
	app.get('/profile', isLoggedIn, function(req, res) {
        Token.createToken(req.user.local.email, function(err, token){
            if (err) {
                console.log(err);
            } else {
                console.log("Set token to : ", token.token);
                res.header('token', token.token);
                res.header('user', token.email);
                res.header('status', 'login');
                res.render('profile.html', {
                    user : req.user
                });
            }
        });
	});

	// LOGOUT ==============================
	app.get('/logout', function(req, res) {
        Token.invalidateToken(req.user.local.email, function(err, token){
            if (err) {
                console.log(err);
            } else {
                console.log("Token removed!")
                req.logout();
                res.redirect('/');
            }
        });
	});

    // Token test page=======================
    app.get('/token', isLoggedIn, function(req, res) {
        res.render('token.html');
    });

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

	// locally --------------------------------
		// LOGIN ===============================
		// show the login form
		app.get('/login', function(req, res) {
			res.render('login.html', { message: req.flash('loginMessage') });
		});

		// process the login form
		app.post('/login', passport.authenticate('local-login', {
			successRedirect : '/profile', // redirect to the secure profile section
			failureRedirect : '/login', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));

		// SIGNUP =================================
		// show the signup form
		app.get('/signup', function(req, res) {
			res.render('signup.html', { message: req.flash('signupMessage') });
		});

		// process the signup form
		app.post('/signup', passport.authenticate('local-signup', {
			successRedirect : '/profile', // redirect to the secure profile section
			failureRedirect : '/signup', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));

	// facebook -------------------------------

		// send to facebook to do the authentication
		app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

		// handle the callback after facebook has authenticated the user
		app.get('/auth/facebook/callback',
			passport.authenticate('facebook', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));

	// twitter --------------------------------

		// send to twitter to do the authentication
		app.get('/auth/twitter', passport.authenticate('twitter', { scope : 'email' }));

		// handle the callback after twitter has authenticated the user
		app.get('/auth/twitter/callback',
			passport.authenticate('twitter', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));


	// google ---------------------------------

		// send to google to do the authentication
		app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

		// the callback after google has authenticated the user
		app.get('/auth/google/callback',
			passport.authenticate('google', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));

// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

	// locally --------------------------------
		app.get('/connect/local', function(req, res) {
			res.render('connect-local.html', { message: req.flash('loginMessage') });
		});
		app.post('/connect/local', passport.authenticate('local-signup', {
			successRedirect : '/profile', // redirect to the secure profile section
			failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));

	// facebook -------------------------------

		// send to facebook to do the authentication
		app.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

		// handle the callback after facebook has authorized the user
		app.get('/connect/facebook/callback',
			passport.authorize('facebook', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));

	// twitter --------------------------------

		// send to twitter to do the authentication
		app.get('/connect/twitter', passport.authorize('twitter', { scope : 'email' }));

		// handle the callback after twitter has authorized the user
		app.get('/connect/twitter/callback',
			passport.authorize('twitter', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));


	// google ---------------------------------

		// send to google to do the authentication
		app.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

		// the callback after google has authorized the user
		app.get('/connect/google/callback',
			passport.authorize('google', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

	// local -----------------------------------
	app.get('/unlink/local', isLoggedIn, function(req, res) {
		var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
             res.redirect('/profile');
        });
	});

	// facebook -------------------------------
	app.get('/unlink/facebook', isLoggedIn, function(req, res) {
		var user            = req.user;
		user.facebook.token = undefined;
		user.save(function(err) {
			res.redirect('/profile');
		});
	});

	// twitter --------------------------------
	app.get('/unlink/twitter', isLoggedIn, function(req, res) {
		var user           = req.user;
		user.twitter.token = undefined;
		user.save(function(err) {
			res.redirect('/profile');
		});
	});

	// google ---------------------------------
	app.get('/unlink/google', isLoggedIn, function(req, res) {
		var user          = req.user;
		user.google.token = undefined;
		user.save(function(err) {
			res.redirect('/profile');
		});
	});

    // =============================================================================
    // Token API                                                       =============
    // =============================================================================

    // Authenticates with the session cookie. This api should be called after login
    // in a web applications.
    app.get('/api/token/generate', isLoggedIn, function(req, res) {
        console.log("This is the e-mail: " + req.user.local.email);
        Token.createToken(req.user.local.email, function(err, token){
            if (err) {
                console.log(err);
                res.json({error: err});
            } else {
                res.json({
                        email: token.email,
                        token: token.token
                });
            }
        });
    });

    app.get('/api/token/invalidate', function(req, res) {
        Token.invalidateToken(req.user.local.email, function(err, token){
            if (err) {
                console.log(err);
                res.json({error: err});
            } else {
                res.json({
                    email: token.email,
                    token: token.token
                });
            }
        });
    });


    app.get('/api/test', function(req, res) {
        var incomingToken = req.headers.token;
        console.log('incomingToken: ' + incomingToken);
        Token.findUserByToken(incomingToken, function(err, user) {
            if (err) {
                console.log(err);
                res.json({error: err});
            } else {
                res.json({
                    log: {
                        user: user,
                        message: "This is just a simulation of an API endpoint"
                    }
                });
            }
        });
    });
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/');
}
