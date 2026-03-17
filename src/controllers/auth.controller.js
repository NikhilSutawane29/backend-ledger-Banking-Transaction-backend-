const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlacklistModel = require("../models/blacklist.model");

// here we will define the controller function for user registration. This function will handle the logic for registering a new user, including validating the input data, creating a new user in the database, and sending an appropriate response back to the client. api - POST /api/auth/register
const registerUser = async (req, res) => {
  const { email, name, password } = req.body; // here we are extracting the email, name, and password from the request body. This assumes that the client is sending a JSON object with these fields in the request body when making a POST request to the /api/auth/register endpoint.

  if (!email || !name || !password) {
    return res.status(400).json({
      success: false,
      message: "Email, name, and password are required",
    });
  }

  const isExists = await userModel.findOne({
    email: email,
  });

  if (isExists) {
    return res.status(422).json({
      success: false,
      message: "Email already exists",
    });
  }

  // if the email does not already exist, we will create a new user in the database using the userModel. We will pass the email, name, and password to the create method of the userModel, which will handle the logic for saving the new user to the database. The create method will also trigger the pre-save middleware defined in the user model to hash the password before saving it to the database. After the user is created, we will generate a JWT token for the user, which can be used for authentication in future requests. The token will contain the user's ID as the payload and will be signed using a secret key defined in the environment variables (process.env.JWT_SECRET_KEY). Finally, we will send a response back to the client indicating that the registration was successful, along with the generated token.
  const user = await userModel.create({
    email,
    name,
    password,
  });

  // after registering the user, we will generate a JWT token for the user because we want to authenticate the user in future requests.
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "1d",
  }); // here we are generating a JWT token using the jwt.sign() method. The first argument is the payload, which contains the user's ID (user._id). The second argument is the secret key used to sign the token, which is stored in the environment variable process.env.JWT_SECRET_KEY. The third argument is an options object where we specify that the token should expire in 1 day (expiresIn: "1d"). This means that the token will be valid for 1 day from the time it is generated, after which it will expire and the user will need to log in again to obtain a new token.

  res.cookie("token", token);

  try {
    await emailService.sendRegistrationEmail(user.email, user.name);
  } catch (error) {
    console.error("Failed to send registration email:", error.message);
  }

  return res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    success: true,
    message: "User registered successfully",
    token: token,
  });
};

// here we will define the controller function for user login. This function will handle the logic for authenticating a user, including validating the input data, checking if the user exists in the database, comparing the provided password with the hashed password stored in the database, generating a JWT token if the authentication is successful, and sending an appropriate response back to the client. api - POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email: email }).select("+password"); // here we are querying the database to find a user with the provided email. We use the findOne method of the userModel to search for a user document that matches the email field. If a user with the provided email is found, it will be returned as a JavaScript object and stored in the user variable. If no user is found, user will be null.

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found with this email",
    });
  }

  // if user find with the provided email, we will compare the provided password with the hashed password stored in the database. We will use the comparePassword method defined in the user model to perform this comparison.
  const isMatch = await user.comparePassword(password); // here we are using the comparePassword method defined in the user model to compare the provided password with the hashed password stored in the database. The comparePassword method takes the candidate password (the password provided by the user during login) as an argument and uses bcrypt.compare() to compare it with the hashed password stored in this.password. The bcrypt.compare() function returns a boolean value indicating whether the passwords match or not. If the passwords match, it will return true; otherwise, it will return false. We store the result of this comparison in the isMatch variable.

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid password",
    });
  }

  // if password is correct, we will generate a JWT token for the user
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "1d",
  });

  res.cookie("token", token);

  return res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    success: true,
    message: "User logged in successfully",
    token: token,
  });
};

const userLogout = async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // here we are trying to retrieve the JWT token from the request. We first check if the token is present in the cookies (req.cookies.token). If it is not found in the cookies, we then check if it is present in the Authorization header (req.headers.authorization) and extract it by splitting the header value (which is expected to be in the format "Bearer <token>") and taking the second part (the actual token) using split(" ")[1].

  if (!token) {
    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  }

  await tokenBlacklistModel.create({
    token: token,
  }); // here we are adding the token to the blacklist collection in the database. This means that even if the token is still valid (i.e., has not expired), it will be considered invalid for authentication purposes because it has been blacklisted. This is a common approach to handle user logout in JWT-based authentication systems, as it allows us to invalidate tokens without having to wait for them to expire.

  res.clearCookie("token"); // here we are clearing the token cookie from the client's browser. This is done to remove the token from the client's side, ensuring that it cannot be used for authentication in future requests. By clearing the cookie, we are effectively logging the user out on the client side as well.

  return res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
};

module.exports = {
  registerUser,
  loginUser,
  userLogout,
};
