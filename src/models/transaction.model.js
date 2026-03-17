
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    // fromAccount - means those account from which the money is being transferred. It is a reference to the account collection in our database.
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "From account reference is required for creating a transaction"],
        index: true, // if we want to find all the transactions related to a specific account, we can use this index to quickly retrieve those transactions without having to scan through the entire collection. This is especially beneficial when we have a large number of transactions and need to efficiently retrieve transactions for a particular account. By creating an index on the fromAccount field, MongoDB can utilize the index to quickly locate the relevant transactions without having to scan through the entire collection, resulting in improved query performance.
    },

    // toAccount - means those account to which the money is being transferred. It is a reference to the account collection in our database.
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account", 
        required: [true, "To account reference is required for creating a transaction"],
        index: true, // if we want to find all the transactions related to a specific account, we can use this index to quickly retrieve those transactions without having to scan through the entire collection. This is especially beneficial when we have a large number of transactions and need to efficiently retrieve transactions for a particular account. By creating an index on the toAccount field, MongoDB can utilize the index to quickly locate the relevant transactions without having to scan through the entire collection, resulting in improved query performance.
    },
    status: {
        type: String,
        enum: {
            values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message: "Status must be either PENDING, COMPLETED, FAILED, or REVERSED",
        },
        default: "PENDING",
    },
    amount: {
        type: Number,
        required: [true, "Amount is required for creating a transaction"],
        min: [0, "Amount must be a positive number"], // here we are setting a minimum value of 0 for the amount field. This means that the amount must be a positive number (greater than or equal to 0) when creating a transaction. If someone tries to create a transaction with a negative amount, it will trigger a validation error and prevent the transaction from being created in the database. This is important to ensure that we do not have transactions with negative amounts, which would not make sense in the context of a banking system where transactions typically involve transferring money from one account to another.
    },

    // IdempotencyKey - we used to track every transaction in our system. It is a unique identifier that is generated for each transaction and is used to ensure that the same transaction is not processed multiple times. This is particularly important in scenarios where there may be network issues or other factors that could lead to duplicate requests being sent to the server. By using an idempotency key, we can safely retry a transaction without worrying about creating duplicate entries in our database or processing the same transaction multiple times. The idempotency key allows us to identify and handle duplicate requests gracefully, ensuring the integrity of our transaction processing system.
    idempotencyKey: {
        type: String,
        required: [true, "Idempotency key is required for creating a transaction"],
        index: true, // if we want to find a transaction based on its idempotency key, we can use this index to quickly retrieve that transaction without having to scan through the entire collection. This is especially beneficial when we have a large number of transactions and need to efficiently retrieve a transaction based on its unique idempotency key. By creating an index on the idempotencyKey field, MongoDB can utilize the index to quickly locate the relevant transaction without having to scan through the entire collection, resulting in improved query performance.
        unique: true, 
    }
}, {
    timestamps: true
});


const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;