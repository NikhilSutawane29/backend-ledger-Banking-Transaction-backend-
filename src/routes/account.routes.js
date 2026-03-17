
const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const accountController = require("../controllers/account.controller");



const router = express.Router();


// api for POST - /api/accounts/ - to create a new account for the authenticated user - means token is required in the request header for authentication and authorization this is called Protected route
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);







// GET - /api/accounts/ - to get all accounts of the authenticated user - means token is required in the request header for authentication and authorization this is called Protected route
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController);





// GET - /api/accounts/balance/:accountId - to get the balance of a specific account by its ID - means token is required in the request header for authentication and authorization this is called Protected route
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController);




module.exports = router;
