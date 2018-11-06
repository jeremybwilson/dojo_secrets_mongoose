const mongoose = require('mongoose'),
      User = mongoose.model('User'),
      Secret = mongoose.model('Secret'),
      Comment = mongoose.model('Comment')

module.exports = (app) => {
    // routing
        // root route - display all
    app.get('/', (request, response) => {
        if(request.session.isLoggedIn == null){
            console.log(`getting the index route`)
            response.render('index', {title: 'Login'} );
        } else {
            console.log(`session.isLoggedIn set to true so redirecting to the secrets route`);
            response.redirect('/secrets');
        }
    });

    // view all secrets route
    app.get('/secrets', (request, response) => {
        // console.log('request.session info stored in secrets get route:', request.session);
        if (request.session.user_id == null){
            response.redirect('/');
        } else {
            response.locals.user_id = request.session.user_id;
            const isLoggedIn = request.session.isLoggedIn; 
            const name = request.session.name; 
            // console.log(`isLoggedIn: ${isLoggedIn}`);
            Secret.find({}).sort('-createdAt')
                .then(all_secrets => {
                    const secrets = all_secrets;
                    console.log(`all secrets: ${all_secrets}`);
                    response.render('secrets', { isLoggedIn, name, secrets: secrets, title: 'Dojo Secrets' });
                })
                .catch(error => {
                    console.log('error finding secrets');
                    for(let key in error.errors){
                        console.log(error.errors[key].message)
                        request.flash('find_secrets_error', error.errors[key].message)
                    }
                    response.render('secrets', { errors, title: 'Secrets page' });
                });
        }
    });

    app.post('/secrets', function(request, response){
        console.log("POST DATA", request.body);
        console.log('request.session.user_id:', request.session.user_id);
        const author_id = request.session.user_id;
        const secret = new Secret({ author_id: author_id, content: request.body.content });
        secret.save(request.body)
            .then(secret => {
                console.log('successfully created secret and redirecting to secret form page:', secret);
                response.redirect('/secrets');
            })
            .catch(error => {
                console.log('there was an error posting to secrets');
                for(let key in error.errors){
                    console.log(error.errors[key].message);
                    request.flash('create_secret_error', error.errors[key].message);
                    // response.render('secrets', { error });
                }
                response.redirect('/secrets');
            })
    });

    // view individual secrets => route
    app.get('/secrets/:_id', (request, response) => {
        const which = request.params._id;
        console.log(`getting an individual secret route`);
        if (request.session.user_id == null){
            response.redirect('/')
        } else {
            response.locals.user_id = request.session.user_id
            Secret.findById(which)
                .then(secret => {
                    console.log(`successfully found and rendered a secret`);
                    response.render('specific', {secret: secret, title: 'View Secret'});
                })
                .catch(error => {
                    console.log('error finding individual secret');
                    for(let key in error.errors){
                        console.log(error.errors[key].message)
                        request.flash('find_secrets_error', error.errors[key].message)
                    }
                    response.redirect('/secrets');
                });
        }
    });

    // delete a secret from the db => route
    app.post('/secrets/:_id/delete', (request, response) => {
        const which = request.params.id;
        Secret.deleteOne({ _id:which })
        .then(secrets => {
            console.log(`successfully deleted a secret`);
            response.redirect('/secrets');
        })
        .catch(error => {
            console.log('there was an error deleting a secret: ', error);
            response.redirect('/secrets');
        })
    });

    // registration route
    app.post('/new', (request, response) => {
        // response.redirect('/secrets');
        console.log('POST DATA', request.body);
        // const user = new User({
        //     first_name: request.body.first_name,
        //     last_name: request.body.last_name,
        //     email: request.body.email,
        //     date_of_birth: request.body.date_of_birth
        // });
        console.log('request.body', request.body)
        console.log(`processed user registration info`);
        User.create(request.body)
            .then(userInfo => {
                // render dashboard
                request.session.user_id = userInfo._id;
                request.session.name = userInfo.first_name;
                request.session.email = userInfo.email;
                request.session.isLoggedIn = true;
                console.log('successfully added new user: ', request.session);
                response.redirect('/secrets');
            })
            .catch(error => {
                for(let key in error.errors){
                    request.flash('user_registration_error', error.errors[key].message);
                    console.log(error.errors[key].message);
                }
                response.redirect('/');
            })
    });

    // login route
    app.post('/login', (request, response) => {
        console.log(`posting to the user login route`);
        User.findOne({ email: request.body.email })
            .then(userInfo => {
                if(!userInfo){
                    throw new Error();
                }
                console.log(`successfully matched a user in the database`);
                return User.validatePassword(request.body.password, userInfo.password)
                    .then((result) => {
                        if(result === true){
                            // assign session variables
                            request.session.user_id = userInfo._id;
                            request.session.email = userInfo.email;
                            request.session.name = userInfo.first_name;
                            request.session.isLoggedIn = true;
                            // render dashboard
                            response.redirect('/secrets');
                        } else {
                            error = result;
                            response.render('index', { error: 'Invalid password.  Re-enter password.', title: 'Login' });
                        }
                    })
            })
            .catch(error => {
                console.log('errors at login:', error);
                response.render('index', { error: 'Email and password combination does not exist', title: 'Login' });
            });
    });

    // logout route
    app.get('/logout', (request, response) => {
        // request.session.user_id = null;
        // request.session.email = null;
        // request.session.isLoggedIn = null;
        // session.destroy() instead of all the above null session variables
        request.session.destroy();
        response.redirect('/');
    });

    // catch 404 and forward to error handler
    app.use((request, response, next) => {
        const err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // error handler
    app.use((err, request, response, next) => {
        // set locals, only providing error in development
        response.locals.message = err.message;
        response.locals.error = request.app.get('env') === 'development' ? err : {};
        response.status(err.status || 500);
        // render the error page
        response.render('error', {title: 'Error page'});
    });
}