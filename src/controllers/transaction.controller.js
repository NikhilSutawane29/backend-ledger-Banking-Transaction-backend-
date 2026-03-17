
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");


/*
    Create a new transaction 
    - The 10-step Transfer follow:
    1. Validate the request body to ensure that all required fields are present and correctly formatted.
    2. Validate the idempotency key to ensure that the same transaction is not processed multiple times.
    3. Check account status for both fromAccount and toAccount to ensure that they are active and can participate in the transaction.
    4. Derive sender balance from ledger entries to ensure that the sender has sufficient funds to complete the transaction.
    5. Create a new transaction document in the database with the status set to "PENDING".
    6. Create DEBIT ledger entry for the fromAccount to reflect the amount being debited from the sender's account.
    7. Create CREDIT ledger entry for the toAccount to reflect the amount being credited to the recipient's account.
    8. Mark the transaction as "COMPLETED" if both ledger entries are successfully created, or "FAILED" if there is an error during the ledger entry creation process.
    9. Commit MongoDB transaction to ensure that all operations are atomic and consistent.
    10. Send email notifications to both the sender and recipient about the transaction status and details.
*/


const createTransaction = async (req, res) => {

    // Step 1: Validate the request body to ensure that all required fields are present and correctly formatted.
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields: fromAccount, toAccount, amount, and idempotencyKey are all required." });
    }

    // here we check our fromAccount are exist or not
    const fromUserAccount = await accountModel.findByOne({
        _id: fromAccount
    })

    // here we check our toAccount are exist or not
    const toUserAccount = await accountModel.findByOne({
        _id: toAccount
    })

    if(!fromUserAccount || !toUserAccount) {
        return res.status(400).json({ message: "Invalid fromAccount or toAccount: One or both accounts do not exist." });
    }




    // Step 2: Validate the idempotency key to ensure that the same transaction is not processed multiple times.
    const isTransactionAlreadyExist = await transactionModel.findOne({
        idempotencyKey: idempotencyKey  // we are checking our transaction is exist or not with the help of idempotency key because idempotency key is unique for each transaction and it will help us to prevent duplicate transactions in case of network issues or client retries.
    })

    if (isTransactionAlreadyExist) {
        if(isTransactionAlreadyExist.status === "COMPLETED") {
            return res.status(200).json({ message: "Transaction already processed successfully.", transaction: isTransactionAlreadyExist });
        }

        if(isTransactionAlreadyExist.status === "PENDING") {
            return res.status(200).json({ message: "Transaction is already in progress."});
        }

        if(isTransactionAlreadyExist.status === "FAILED") {
            return res.status(500).json({ message: "Previous transaction attempt failed. Please try again."});
        }

        if(isTransactionAlreadyExist.status === "REVERSED") {
            return res.status(500).json({ message: "Previous transaction was reversed. Please try again."});
        }
    }



    // Step 3: Check account status for both fromAccount and toAccount to ensure that they are active and can participate in the transaction.
    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({ message: "One or both accounts are not active. Transactions can only be processed between active accounts." });
    }



    // Step 4: Derive sender balance from ledger entries to ensure that the sender has sufficient funds to complete the transaction. - for that we use aggregation pipeline to calculate the balance of the sender's account by summing up all the DEBIT and CREDIT entries in the ledger for that account. We will use $match stage to filter the ledger entries for the sender's account, then we will use $group stage to calculate the total DEBIT and CREDIT amounts, and finally we will use $project stage to calculate the final balance by subtracting the total DEBIT from the total CREDIT.
    const balance = await fromUserAccount.getBalance();

    if(balance < amount) {
        return res.status(400).json({ message: `Insufficient balance. Current balance: ${balance}, Required: ${amount}` });
    }




    let transaction;
    try {
    // Step 5: Create a new transaction document in the database with the status set to "PENDING".
    const session = await mongoose.startSession(); // here we are starting a new MongoDB session to perform the transaction operations atomically. This allows us to ensure that all the operations related to the transaction (creating the transaction document, creating ledger entries, updating account balances) are treated as a single unit of work. If any of the operations fail, we can roll back the entire transaction to maintain data integrity.

    
    transaction = (await transactionModel.create([{
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    }], { session }))[0];   // here we are creating a new transaction document in the database with the provided details (fromAccount, toAccount, amount, idempotencyKey) and setting the initial status to "PENDING". We are also passing the session object to ensure that this operation is part of the MongoDB transaction. The create method returns an array of created documents, so we are accessing the first element of the array (i.e., [0]) to get the created transaction document.

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromAccount,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
    }], { session })


    // here we are simulating a delay of 1 second to mimic the time taken for processing the transaction and creating the debit ledger entry. This is just for demonstration purposes and can be removed in a real implementation where the actual processing time may vary based on various factors such as database performance, network latency, etc.
    await (() => {
        return new Promise((resolve) => setTimeout(() => resolve(), 15 * 1000)); // here we are simulating a delay of 1 second to mimic the time taken for processing the transaction and creating the debit ledger entry. This is just for demonstration purposes and can be removed in a real implementation where the actual processing time may vary based on various factors such as database performance, network latency, etc.
    })
    

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
    }], { session })


    // here we are updating the status of the transaction to "COMPLETED" after successfully creating both the debit and credit ledger entries. We are using the findOneAndUpdate method of the transactionModel to update the transaction document with the new status. We are also passing the session object to ensure that this operation is part of the MongoDB transaction. If there was an error during the creation of either ledger entry, we would have rolled back the transaction and set the status to "FAILED" instead.
    await transactionModel.findOneAndUpdate(
        { _id: transaction._id },
        { status: "COMPLETED" },
        { session }
    )

    // here we are committing the MongoDB transaction to ensure that all the operations we performed (creating the transaction document, creating ledger entries) are saved to the database atomically. If any of the operations had failed, we could have rolled back the transaction to maintain data integrity. By committing the transaction, we are finalizing all the changes we made to the database as part of this transaction process.
    await session.commitTransaction();
    session.endSession();

} catch (err) {
    
    return res.status(400).json({ message: "Transaction is Pending due to some issue, please try again later.", error: err.message });
}




    // Step 10: Send email notifications to both the sender and recipient about the transaction status and details.
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount); // here we are sending an email notification to the sender (authenticated user) about the transaction details, including the amount transferred and the recipient account. We are using the sendTransactionEmail function from our email service to send this email.

    return res.status(201).json({
        success: true,
        message: "Transaction completed successfully",
        transaction: transaction,
    });
}














// New Controller function to create initial funds transaction for system user
// So here we are creating a new controller function called createInitialFundsTransaction which will be responsible for creating an initial funds transaction for the system user. This function will be used to fund the system user account with some initial amount of money, which can then be used to transfer funds to regular user accounts when needed (e.g., for testing purposes or to provide initial balance to new users). The function will follow a similar process as the createTransaction function, but it will specifically handle transactions where the fromAccount is the system user account and the toAccount is a regular user account. We will also need to ensure that only authenticated system users can access this endpoint by using the appropriate authentication middleware.

const createInitialFundsTransaction = async (req, res) => {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields: toAccount, amount, and idempotencyKey are all required." });
    }


// here we are checking our toAccount are exist or not because for initial funds transaction our toAccount will be user account and we need to check that user account is exist or not before creating the transaction. If the user account does not exist, we will return an error response indicating that the toAccount is invalid because the user account is required to create the initial funds transaction.
    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    })

    if(!toUserAccount) {
        return res.status(400).json({ message: "Invalid toAccount: Account does not exist." });
    }



// here we are checking our fromAccount are exist or not because for initial funds transaction our fromAccount will be system user account and we need to check that system user account is exist or not before creating the transaction. If the system user account does not exist, we will return an error response indicating that the fromAccount is invalid because the system user account is required to create the initial funds transaction.
    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if(!fromUserAccount) {
        return res.status(400).json({ message: "Invalid fromAccount: System user account does not exist." });
    }



// After validating the request body and checking the existence of both the toAccount (user account) and fromAccount (system user account), we can proceed to create the initial funds transaction for the system user. This involves creating a new transaction document in the database with the appropriate details, such as the fromAccount, toAccount, amount, idempotencyKey, and status. We will also need to create corresponding ledger entries for both accounts to reflect the debit from the system user account and the credit to the user account. Finally, we will commit the transaction and send an email notification to the user about the successful creation of the initial funds transaction.
const session = await mongoose.startSession();
session.startTransaction();

const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING"
});

const debitLedgerEntry = await ledgerModel.create([{
    account: fromUserAccount._id,
    amount: amount,
    transaction: transaction._id,
    type: "DEBIT"
}], { session });

const creditLedgerEntry = await ledgerModel.create([{
    account: toAccount,
    amount: amount,
    transaction: transaction._id,
    type: "CREDIT"
}], { session });


transaction.status = "COMPLETED";
await transaction.save({ session });

await session.commitTransaction();
session.endSession();

return res.status(201).json({
    success: true,
    message: "Initial funds transaction completed successfully",
    transaction: transaction,
});

}



module.exports = {
    createTransaction,
    createInitialFundsTransaction
};
