
const accountModel = require("../models/account.model");


// logic for creating a new account for the authenticated user - here it can create an account for the user with user ID and default status and currency. The balance will be calculated based on the transactions in the Ledger collection, so we don't need to set it here.
const createAccountController = async (req, res) => {

    const user = req.user; // here we are getting the authenticated user from the req.user property, which was set by the authMiddleware. This means that the user must be authenticated (i.e., must have a valid token) to access this controller function.

    const account = await accountModel.create({
        user: user._id, // here we are setting the user field of the account document to the ID of the authenticated user (user._id). This establishes a relationship between the account and the user in the database, allowing us to associate the account with the specific user who created it.
    });

    return res.status(201).json({
        success: true,
        message: "Account created successfully",
        account: account,
    });

}






// logic for getting all accounts of the authenticated user - here we are finding all accounts in the database that belong to the authenticated user (i.e., accounts where the user field matches the ID of the authenticated user). This allows us to retrieve all accounts associated with the specific user.
const getUserAccountsController = async (req, res) => {

    const accounts = await accountModel.find({ user: req.user._id }); // here we are finding all accounts in the database that belong to the authenticated user (i.e., accounts where the user field matches the ID of the authenticated user). This allows us to retrieve all accounts associated with the specific user.

    return res.status(200).json({
        success: true,
        message: "Accounts retrieved successfully",
        accounts: accounts,
    });

}






//
const getAccountBalanceController = async (req, res) => {
    const { accountId } = req.params; // here we are getting the accountId from the request parameters (i.e., from the URL). This allows us to identify which account's balance we want to retrieve.

    const account = await accountModel.findOne({ 
        _id: accountId, 
        user: req.user._id 
    }); // here we are finding the account in the database that matches the provided accountId and belongs to the authenticated user (i.e., where the _id field matches the accountId and the user field matches the ID of the authenticated user). This ensures that we are retrieving the balance for the correct account that belongs to the specific user.

    if(!account) {
        return res.status(404).json({
            success: false,
            message: "Account not found",
        });
    }


    // if account is found, we can calculate the balance based on the transactions in the Ledger collection. This can be done by calling a method on the account document that interacts with the Ledger collection to retrieve the relevant transactions and calculate the balance accordingly.
    const balance = await account.getBalance(); // here we are calling a method getBalance() on the account document, which is responsible for calculating the balance based on the transactions in the Ledger collection. This method can be defined in the account model and will interact with the Ledger collection to retrieve the relevant transactions and calculate the balance accordingly.

    return res.status(200).json({
        success: true,
        message: "Account balance retrieved successfully",
        balance: balance,
    });
} 



module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
};