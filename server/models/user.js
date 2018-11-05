const mongoose = require('mongoose');
const { Schema } = mongoose;
const saltRounds = 10;

// User schema
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
        next();
    })
    .catch(next);
})

// to validate a password, use the UserSchema and statics.  What this does is like a prototype for the model
// so we call the 'statics' object and create a new method for it with the name we assign.
// statics is the static information to a Class
// we will return a boolean value to the handle elsewhere => separation of concerns
UserSchema.statics.validatePassword = function(password_from_form, stored_hashed_password){
    return bcrypt.compare(password_from_form, stored_hashed_password);
};

// mongoose.model('User', UserSchema); // We are setting this Schema in our Models as 'User'
module.exports = mongoose.model('User', UserSchema);