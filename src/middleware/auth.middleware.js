const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // here we are trying to get the token from the cookies or from the authorization header. The token can be sent by the client in either of these two ways, so we check both places to retrieve the token. If the token is present in the cookies, we use that; otherwise, we check the authorization header for a Bearer token and extract it.

  const jwtSecret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" }); // if the token is not present in either the cookies or the authorization header, we return a 401 Unauthorized response with a message indicating that no token was provided. This means that the client must provide a valid token to access the protected routes that require authentication.
  }

  if (!jwtSecret) {
    return res
      .status(500)
      .json({ message: "Server configuration error: JWT secret missing" });
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token: token }); // here we are checking if the token is blacklisted by querying the tokenBlacklistModel to see if there is a document with the token field matching the provided token. If such a document exists, it means that the token has been blacklisted (e.g., due to user logout or token revocation), and we should not allow access to protected routes using this token.

  if (isBlacklisted) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Token is blacklisted" }); // if the token is found in the blacklist, we return a 401 Unauthorized response with a message indicating that the token is blacklisted. This means that the client must provide a valid token that is not blacklisted to access the protected routes that require authentication.
  }

  try {
    const decoded = jwt.verify(token, jwtSecret); // here we are verifying the token using the jwt.verify() method. We pass the token and the secret key (process.env.JWT_SECRET) that was used to sign the token when it was created. If the token is valid and has not expired, the jwt.verify() method will return the decoded payload of the token, which typically contains information about the user (e.g., user ID, email, etc.). If the token is invalid or has expired, it will throw an error, which we catch in the catch block

    const user = await userModel.findById(decoded.userId); // here we are querying the database to find the user associated with the token. We use the user ID that we extracted from the decoded token (decoded.userId) to find the user in the database using the findById method of the userModel. If a user with the provided ID is found, it will be returned as a JavaScript object and stored in the user variable. If no user is found, user will be null.

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user; // if the user is found in the database, we attach the user object to the req object (req.user) so that it can be accessed in the subsequent middleware functions or route handlers. This allows us to have access to the authenticated user's information throughout the request-response cycle.

    return next(); // if the token is valid and the user is found, we call next() to pass control to the next middleware function or route handler in the Express.js request-response cycle. This means that the authentication was successful, and the user can access the protected routes that require authentication.
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" }); // if the token is invalid or has expired, we return a 401 Unauthorized response with a message indicating that the token is invalid. This means that the client must provide a valid token to access the protected routes that require authentication.
  }
};

const systemUserAuthMiddleware = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token: token }); // here we are checking if the token is blacklisted by querying the tokenBlacklistModel to see if there is a document with the token field matching the provided token. If such a document exists, it means that the token has been blacklisted (e.g., due to user logout or token revocation), and we should not allow access to protected routes using this token.

  if (isBlacklisted) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Token is blacklisted" }); // if the token is found in the blacklist, we return a 401 Unauthorized response with a message indicating that the token is blacklisted. This means that the client must provide a valid token that is not blacklisted to access the protected routes that require authentication.
  }

  // if token is present then we will verify the token and check if the user is system user or not. If the user is system user then we will allow the request to proceed to the next middleware or route handler, otherwise we will return a 403 Forbidden response.
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId).select("+systemUser");
    // here +systemUser means in user model we have set select: false for systemUser field because it is sensitive information and we don't want to expose it in the response by default. But in this case, we need to check if the user is a system user or not, so we explicitly include the systemUser field in the query result using +systemUser.

    if (!user.systemUser) {
      return res.status(403).json({ message: "Forbidden: Access is denied" }); // if the user is not a system user, we return a 403 Forbidden response with a message indicating that access is denied. This means that the client does not have the necessary permissions to access the protected routes that require system user authentication.
    }

    // if the user is a system user, we attach the user object to the req object (req.user) so that it can be accessed in the subsequent middleware functions or route handlers. This allows us to have access to the authenticated system user's information throughout the request-response cycle.
    req.user = user;

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = {
  authMiddleware,
  systemUserAuthMiddleware,
};
