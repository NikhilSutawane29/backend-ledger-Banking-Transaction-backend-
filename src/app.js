const express = require("express");
const cookiesParser = require("cookie-parser");

const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");

const app = express();

app.use(express.json()); // this middleware is used to parse the incoming JSON data in the request body. It allows us to access the data sent by the client in a structured format (as a JavaScript object) through req.body in our route handlers. This is essential for handling POST, PUT, and PATCH requests where the client sends data to the server.

app.use(cookiesParser()); // this middleware is used to parse the cookies sent by the client in the request headers. It allows us to access the cookies in a structured format (as a JavaScript object) through req.cookies in our route handlers. This is useful for handling authentication tokens or any other data that we want to store in cookies on the client side and access on the server side.


// Dummy api to test:- 
app.get("/", (req, res) => {
    res.send("Ledger Service is up and running");
});


app.use("/api/auth", authRouter); // this line is used to mount the authRouter on the /api/auth path. This means that any routes defined in the authRouter will be accessible under the /api/auth path. For example, if we define a route for user registration in the authRouter as router.post("/register", ...), it will be accessible at /api/auth/register. This helps in organizing our routes and keeping related routes together under a common path prefix.
app.use("/api/accounts", accountRouter);

module.exports = app;
