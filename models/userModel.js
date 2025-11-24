const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'Please add a first name'],
        },
        lastName: {
            type: String,
            required: [true, 'Please add a last name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [/.+\@.+\..+/, 'Please fill a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
        },
        profilePicture: {
            type: String,
            default: '/default-avatar.png' 
        }
    },
    {
        timestamps: true, 
    }
);

// This function runs automatically BEFORE a user document is saved
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// This adds a custom method to any user document to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);