
const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "User reference is required for creating an account"],
        index: true, // the meaning of index: true is that we will create an index on the user's ID field in the account collection. This will improve the performance of when in future we are "searching for accounts based on the user ID". By creating an index on the user field, MongoDB can quickly locate the relevant documents in the account collection when we query for accounts associated with a specific user. This is especially beneficial when we have a large number of accounts and need to efficiently retrieve accounts for a particular user. it happens by "B+tree" data structure, which allows for fast lookups and efficient querying based on the indexed field. So, when we query for accounts using the user ID, MongoDB can utilize the index to quickly find the relevant accounts without having to scan through the entire collection, resulting in improved query performance.
    },
    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FROZEN", "CLOSED"],
            message: "Status must be either ACTIVE, FROZEN, or CLOSED",
        },
        default: "ACTIVE",
    },
    currency: {
        type: String,
        required: [true, "Currency is required for creating an account"],
        default: "INR"
    },

    // Note :- we cannot store the "Balance" directly in out Database, so we use Ledger - means we will have a separate collection called "Ledger" where we will store all the transactions related to the account. The balance of the account can be calculated by summing up all the transactions in the Ledger for that account. This way, we can keep track of all the transactions and maintain an accurate balance for each account without having to update the balance field directly in the account document every time a transaction occurs.

}, {
    timestamps: true, 
});



// Here we say compound index means that we will create an index on "both" the user and status fields together. 
accountSchema.index({ user: 1, status: 1 }); // here we are creating a "compound index" on the user and status fields in the account collection. This means that MongoDB will create an index that includes both the user and status fields together. Here it is used when we want to search for accounts based on both the user ID and the account status. By creating a compound index on these two fields, MongoDB can efficiently retrieve accounts that match both criteria (e.g., all active accounts for a specific user) without having to scan through the entire collection. This improves the performance of queries that filter by both user and status, as MongoDB can utilize the compound index to quickly locate the relevant documents in the account collection.








// Here we are defining a method called getBalance on the account schema. This method will be used to calculate the current balance of the account by aggregating the ledger entries associated with that account. The getBalance method uses the aggregate function to perform a series of operations on the ledger collection, including matching the entries for the specific account, grouping them to calculate total DEBIT and CREDIT amounts, and then projecting the final balance by subtracting total DEBIT from total CREDIT. This allows us to derive the current balance of the account based on all the transactions recorded in the ledger without having to store the balance directly in the account document.
accountSchema.methods.getBalance = async function() {

    const balanceData = await ledgerModel.aggregate([
        
        { $match: { account: this._id } }, // here we say - search all those ledger entries where the account field matches the current account's ID. This will filter the ledger entries to only include those that are associated with the current account.
        {
            // here we say - group the matching ledger entries together and calculate the total DEBIT and CREDIT amounts for the account. We will use the $group stage to group the entries by the account ID (which is null in this case since we want a single result) and then we will use the $sum operator to calculate the total DEBIT and CREDIT amounts separately.
            $group: {
                _id: null, // here we want only one sum of all DEBIT and CREDIT entries for the account, so we set _id to null to indicate that we want to group all the matching documents together and calculate a single result.
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: ["$type", "DEBIT"] }, // here we check if the type of the ledger entry is DEBIT, if it is then we will include the amount in the totalDebit calculation, otherwise we will add 0 to the totalDebit.
                            "$amount", // if the type is DEBIT, we will include the amount in the totalDebit calculation.
                            0 // if the type is not DEBIT, we will add 0 to the totalDebit calculation.
                        ]
                    }
                },
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: ["$type", "CREDIT"] }, // here we check if the type of the ledger entry is CREDIT, if it is then we will include the amount in the totalCredit calculation, otherwise we will add 0 to the totalCredit.
                            "$amount", // if the type is CREDIT, we will include the amount in the totalCredit calculation.
                            0 // if the type is not CREDIT, we will add 0 to the totalCredit calculation.
                        ]
                    }
                }
            }
        },

        {
            // here we say - calculate the final balance by subtracting the total DEBIT from the total CREDIT. This will give us the current balance of the account based on all the transactions recorded in the ledger. We will use the $project stage to create a new field called balance that contains the calculated balance for the account.
            $project: {
                _id: 0, // here we say - exclude the _id field from the final result since we don't need it for calculating the balance.
                balance: { $subtract: ["$totalCredit", "$totalDebit"] } // here we say - calculate the final balance by subtracting the total DEBIT from the total CREDIT. This will give us the current balance of the account based on all the transactions recorded in the ledger.
            }
        }

    ])

    // When New Account is created then there will be no ledger entry for that account, so in that case balanceData will be an empty array. So, we need to handle that case and return a balance of 0 when there are no ledger entries for the account.
    if(balanceData.length === 0) {
        return 0; // if there are no ledger entries for the account, we will return a balance of 0.
    }

    return balanceData[0].balance; // if there are ledger entries for the account, we will return the calculated balance from the aggregation result.
}











const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
