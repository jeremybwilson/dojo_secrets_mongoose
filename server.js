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
        maxAge: 600000
    }
}));

//schemas
const UserSchema = new Schema({
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
    }, 
    secrets: [{
        type: Schema.Types.ObjectId,
        ref: 'Secret'
    }]
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
// User.prototype.validatePassword = function(password_from_form, stored_hashed_password){s
    // validation_result = bcrypt.compare(password_from_form, stored_hashed_password);
    // console.log('Validation result here: ', validation_result);
    return bcrypt.compare(password_from_form, stored_hashed_password);
};

mongoose.model('User', UserSchema); // We are setting this Schema in our Models as 'User'
const User = mongoose.model('User', UserSchema);

// secrets are messages to which comments can/will be applied
const SecretSchema = new Schema({
    author_id: {
        type: String,
        required: [true, "User must have a name"]
    },
    content: {
        type: String,
        required: [true, "Message must have content"]
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    // comments: [CommentSchema]
}, {timestamps: true});

mongoose.model('Secret', SecretSchema);  // We are setting this Schema in our Models as 'Secret'
const Secret = mongoose.model('Secret');

// secrets are messages to which comments can/will be applied
const CommentSchema = new Schema({
    content: {
        type: String, 
        required: [true, "Comment must have content"]
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    secret: {
        type: Schema.Types.ObjectId,
        ref: 'Secret'
    }
    // comments: [CommentSchema]
}, {timestamps: true});

mongoose.model('Comment', CommentSchema);  // We are setting this Schema in our Models as 'Secret'
const Comment = mongoose.model('Comment');

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
                // console.log(`all secrets: ${all_secrets}`);
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
    const userId = request.session.user_id;
    const userName = request.session.name;
    if (request.session.user_id == null){
        response.redirect('/')
    } else {
        response.locals.user_id = request.session.user_id
        Secret.findById(which)
            // .populate('user')
            .populate({ path: 'user', select: 'first_name' })
            .populate({ path: 'comments', populate: { path: 'user'}})
            .then(secret => {
                console.log('Secret Object after populate method:', JSON.stringify(secret));
                response.render('specific', {secret: secret,  userId, userName, title: 'View Secret'});
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

app.post('/secrets/:_id/comments', (request, response) => {
    const which = request.params._id;
    Comment.create(request.body)
    // Comment.save({ user: request.session.user_id, content: request.body.content })
        .then(comment => {
            console.log('successfully created comment using: ', request.body);
            return Secret.findById({_id:which})
                .then(secret => {
                    secret.comments.push(comment);
                    console.log(`successfully pushed comment to secret`);
                    return secret.save();
                })
                .then(() => {
                    console.log(`redirecting to individual secret page after comment added`);
                    response.redirect(`/secrets/${which}`);
                })
        })
        .catch(error => {
            console.log(`error posting comment to individual secret: ${error}`);
            for(let key in error.errors){
                console.log(error.errors[key].message)
                request.flash('create_comment_error', error.errors[key].message)
            }
            response.redirect('/secrets');
        })
});

// delete a secret from the db => route
app.post('/secrets/:_id/delete', (request, response) => {
    const which = request.params._id;
    // Secret.deleteOne(which)
    Secret.deleteOne({ _id:which })
    .then(secret => {
        console.log(`successfully deleted a secret`);
        response.redirect('/secrets');
    })
    .catch(error => {
        console.log('there was an error deleting a secret: ', error);
        response.redirect('/secrets');
    })
});

// delete a secret from the db => route
app.post('/comments/:_id/delete', (request, response) => {
    const which = request.params._id;
    // Secret.deleteOne(which)
    Comment.deleteOne({ _id:which })
    .then(secret => {
        console.log(`successfully deleted a secret`);
        response.redirect('/secrets');
    })
    .catch(error => {
        console.log('there was an error deleting a secret: ', error);
        response.redirect('/secrets');
    })
});

// registration (new user) route
app.post('/new', (request, response) => {
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
            console.log(`successfully matched a user in the database`);
            return User.validatePassword(request.body.password, userInfo.password)
                .then((result) => {
                    if(!result){
                        throw new Error();
                    }
                    // assign session variables
                    request.session.user_id = userInfo._id;
                    request.session.email = userInfo.email;
                    request.session.name = userInfo.first_name;
                    request.session.isLoggedIn = true;
                    // render dashboard
                    response.redirect('/secrets');
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

// app.listen(port, () => console.log(`Express server listening on port ${port}`));    // ES6 way