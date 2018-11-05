const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const bcrypt = require('bcrypt');
const parser = require('body-parser');
const color = require('colors');
const mongoose = require('mongoose');
const path = require('path');
const validator = require('validator');
const { Schema } = mongoose;

const saltRounds = 10;
const port = process.env.PORT || 8002;
// invoke express and store the result in the variable app
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'static')));
app.set('views', path.join(__dirname, 'views'));

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use(flash());
app.use(session({
    secret:'superSekretKitteh',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        maxAge: 60000
    }
}));

mongoose.Promise = global.Promise;

//schemas
const UserSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: [true, 'First name is required'],
        minlength: [3, 'First name must be at least three characters'],
        trim: true
    },
    last_name: {
        type: String,
        required: [true, 'Last name is required'],
        minlength: [3, 'Last name must be at least three characters'],
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please enter an email address'],
        dropDups: [true, 'Email already exists in database'],
        validate: {
            validator(email) {
                return validator.isEmail(email);
            },
            message: "Please enter a valid email"
        }
    },
    date_of_birth: {
        type: Date,
        required: [true, 'Please enter date of birth']
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlegth: 8,
        validate: {
            validator: (value) => {
                return /^(?=.*[a-z])(?=[A-Z])(?=.*\d)(?=.*[$@$!#%*?&])[A-Za-z\d$@$!#%*?&]{8,32}/.test(value);
            },
        message: "Password requirements: at least one number, uppercase and special character and be at least 8 characters long"
        }
    }
}, {timestamps: true});

// Hash Password
// we use this hash a password only if it is a new password of if it has been changed.  
// if it is already a hashed pw, don't hash => we ask 'has this field been modified?' 
// attached to the instance created from the model, so it is called in the context of an instance, 
// therefore we use 'this' and not an es6 function
UserSchema.pre('save', function(next){
    if(!this.isModified('password')){
        return next();
    }
    bcrypt.hash(this.password, saltRounds)
    .then(hashed_password => {
        this.password = hashed_password;
        console.log('hashed password: ', hashed_password);
        next();
    })
    .catch(next);
})

// to validate a password, use the UserSchema and statics.  What this does is like a prototype for the model
// so we call the 'statics' object and create a new method for it with the name we assign.
// statics is the static information to a Class
// we will return a boolean value to the handle elsewhere => separation of concerns
UserSchema.statics.validatePassword = function(password_from_form, stored_hashed_password){
    validation_result = bcrypt.compare(password_from_form, stored_hashed_password);
    console.log('Validation result here: ', validation_result);
    return bcrypt.compare(password_from_form, stored_hashed_password);
};

mongoose.model('User', UserSchema); // We are setting this Schema in our Models as 'User'
const User = mongoose.model('User', UserSchema);

// secrets are messages to which comments can/will be applied
const SecretSchema = new mongoose.Schema({
    author_id: {
        type: String,
        required: [true, "User must have a name"]
    },
    content: {
        type: String,
        required: [true, "Message must have content"]
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    // comments: [CommentSchema]
}, {timestamps: true});

mongoose.model('Secret', SecretSchema);  // We are setting this Schema in our Models as 'Secret'
const Secret = mongoose.model('Secret');

//mongodb connection
mongoose.connect('mongodb://localhost:27017/dojo_secrets', { useNewUrlParser: true });
mongoose.connection.on('connected', () => console.log('MongoDB connected'));

// require('./server/config/database');
app.listen(port, () => console.log(`Express server listening on port ${port}`));

//routing
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
                // Comment.find({}, (comments))
                //     .then(all_comments => {
                //         const comments = all_comments;
                //         response.render('secrets', { secrets: secrets, comments: comments, title: 'View all secrets' });
                //     })
                //     .catch(error => {
                //         console.log(`error finding comments`);
                //         for(let key in error.errors){
                //             console.log(error.errors[key].message)
                //             request.flash('find_secrets_error', error.errors[key].message)
                //         }
                //         response.render('secrets', { error, title: 'Secrets page' });
                //     })
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
})

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
            // request.session.user_id = userInfo._id;
            // request.session.name = userInfo.first_name;
            // request.session.email = userInfo.email;
            // console.log('request.session after adding user_id and email at login: ', request.session);
            console.log(`successfully matched a user in the database`);
            // console.log(`database stored password: ${userInfo.password}`);
            // return User.validatePassword(request.body.password, userInfo.password, userInfo._id)
            return User.validatePassword(request.body.password, userInfo.password)
                .then(user => {
                    console.log('user information passed into then promise chain is: ', user);
                    console.log(`user information available here: ${request.body}`);
                    // add to session info
                    request.session.user_id = userInfo._id;
                    request.session.name = userInfo.first_name;
                    request.session.email = userInfo.email;
                    request.session.isLoggedIn = true;
                    // response.render('view', {user, title: 'View User'} );
                    // render dashboard
                    console.log('request.session info stored:', request.session);
                    response.redirect('/secrets');
                    // response.render('secrets', { session_user_id: userInfo._id, title: 'Secrets page' });
                })
                .catch(error => {
                    // we want to re-render the form so user does not need to re-enter all the information.  
                    // If doing a re-direct, they would have to type everything again
                    // const errors = Object.keys(error.errors)
                    //   .map(key => error.errors[key].message)
                    for(let key in error.errors){
                        console.log(error.errors[key].message)
                        request.flash('user_login_error', error.errors[key].message)
                    }
                    response.render('index', { errors, title: 'Login' } );
                })
        })
        .catch(error => {
            console.log('errors at login:', error);
            for(let key in error.errors){
                console.log(error.errors[key].message)
                request.flash('user_login_error', error.errors[key].message)
            }
            // const errors = Object.keys(error.errors)
            // .map(key => error.errors[key].message)
            // re-render the form so user does not need to re-enter all the information.
            // If redirecting, they would have to type everything again
            response.render('index', { error, title: 'Login' });
        });
});

// logout route
app.get('/logout', (request, response) => {
    // request.session.user_id = null;
    // request.session.email = null;
    // request.session.isLoggedIn = null;
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

// app.listen(port, () => console.log(`Express server listening on port ${port}`));    // ES6 way