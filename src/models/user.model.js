
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");




const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required"], // means if any user tries to create an account without providing an email, we will throw an error with the message "Email is required"
        trim: true, // means that we will remove any whitespace from the email before saving it to the database
        lowercase: true, // means that we will convert the email to lowercase before saving it to the database
        match: [/\S+@\S+\.\S+/, "Please provide a valid email address"], // here we check the format of the email using a regular expression. If the email does not match the regular expression, we will throw an error with the message "Please provide a valid email address"
        unique: [true, "Email already exists"], // means that we will not allow two users to have the same email address. If a user tries to create an account with an email that already exists in the database, we will throw an error with the message "Email already exists"
    },
    name: {
        type: String,
        required: [true, "Name is required for creating an account"],
    },
    password: {
        type: String,
        required: [true, "Password is required for creating an account"],
        minlength: [6, "Password must be at least 6 characters long"], 
        select: false, // means that when we query the database for a user, we will not include the password field in the result by default. This is a security measure to prevent the password from being exposed in case of a data breach or if someone gains unauthorized access to the database. If we want to include the password field in the result, we can explicitly specify it in our query using the select method.ex:- User.findOne({ email: " "}).select("+password"), since we have set select: false for the password field, we need to use the + sign before the field name to include it in the result. This way, we can still access the password when needed (e.g., for authentication) while keeping it hidden by default for security reasons.
    },
    systemUser: {
        type: Boolean,
        default: false, // means that by default, when a new user is created, the systemUser field will be set to false. This field can be used to differentiate between regular users and system users (e.g., admin accounts or service accounts) in our application. If we want to create a system user, we can set this field to true when creating the user document in the database.
        immutable: true, // means that once the systemUser field is set for a user document, it cannot be changed. This is to ensure that the role of a user (whether they are a regular user or a system user) remains consistent throughout their account lifecycle. If we try to update the systemUser field for an existing user document, we will get an error indicating that the field is immutable and cannot be modified after it has been set.
        select: false, // means that when we query the database for a user, we will not include the systemUser field in the result by default. This is to prevent the role of the user from being exposed in case of a data breach or if someone gains unauthorized access to the database. If we want to include the systemUser field in the result, we can explicitly specify it in our query using the select method.ex:- User.findOne({ email: " "}).select("+systemUser"), since we have set select: false for the systemUser field, we need to use the + sign before the field name to include it in the result. This way, we can still access the role of the user when needed while keeping it hidden by default for security reasons.
    }
}, {
    timestamps: true, // means that we will automatically add createdAt and updatedAt fields to the user document in the database. The createdAt field will store the date and time when the user was created, and the updatedAt field will store the date and time when the user was last updated. This is useful for keeping track of when a user account was created and when it was last modified.
})









// before saving the user to the database, we will hash the password using bcrypt. This is a security measure to protect the user's password in case of a data breach. Even if someone gains unauthorized access to the database, they will not be able to see the plain text passwords, as they will be stored in a hashed format. Hashing is a one-way process, meaning that it is not possible to reverse the hash back to the original password. When a user tries to log in, we will hash the password they provide and compare it to the hashed password stored in the database to authenticate the user.
userSchema.pre("save", async function() {
    
    if(!this.isModified("password")) {
        return;
    }

    const hash = await bcrypt.hash(this.password, 10); // here we are hashing the password using bcrypt. Here "this" refers to the user document that is being saved to the database. We check if the password field has been modified using the isModified method. If the password has not been modified, we simply call () to move on to the  middleware or save operation without hashing the password again. If the password has been modified (e.g., when creating a new user or updating the password), we hash the password using bcrypt.hash() with a salt rounds value of 10. After hashing the password, we assign the hashed value back to this.password and then call () to proceed with saving the user document to the database.
    // this hash password we save in the database instead of the plain text password.
    this.password = hash;   // "this" means the user document that is being saved to the database. We assign the hashed password to this.password, which will replace the original plain text password before it is saved to the database.

    return;
})







// here we are adding a method to the user schema to compare the candidate password (the password provided by the user during login) with the hashed password stored in the database. This method will be used during the authentication process to verify if the provided password is correct. The method takes the candidate password as an argument and uses bcrypt.compare() to compare it with the hashed password stored in this.password. The bcrypt.compare() function returns a boolean value indicating whether the passwords match or not. If the passwords match, it will return true; otherwise, it will return false.
userSchema.methods.comparePassword = async function(candidatePassword) {

    return await bcrypt.compare(candidatePassword, this.password); // here we are comparing the candidate password (the password provided by the user during login) with the hashed password stored in the database. The bcrypt.compare() function takes the candidate password and the hashed password as arguments and returns a boolean value indicating whether they match or not. If the passwords match, it will return true; otherwise, it will return false. This method can be used during the authentication process to verify if the provided password is correct.
}







const userModel = mongoose.model("user", userSchema);

module.exports = userModel;