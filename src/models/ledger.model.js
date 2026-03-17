
const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Account reference is required for creating a ledger entry"],
        index: true, // if we want to find all the ledger entries related to a specific account, we can use this index to quickly retrieve those ledger entries without having to scan through the entire collection. This is especially beneficial when we have a large number of ledger entries and need to efficiently retrieve ledger entries for a particular account. By creating an index on the account field, MongoDB can utilize the index to quickly locate the relevant ledger entries without having to scan through the entire collection, resulting in improved query performance.
        immutable: true, // here we are setting the immutable property to true for the account field in the ledger schema. This means that once a ledger entry is created with a specific account reference, that reference cannot be changed or updated. This is important to ensure the integrity of our ledger entries and maintain accurate records of transactions associated with each account. By making the account field immutable, we can prevent accidental or intentional changes to the account reference in existing ledger entries, which helps maintain the consistency and reliability of our financial data.
    },
    amount: {
        type: Number,
        required: [true, "Amount is required for creating a ledger entry"],
        immutable: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [true, "Transaction reference is required for creating a ledger entry"],
        index: true, 
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: ["DEBIT", "CREDIT"],
            message: "Type must be either DEBIT or CREDIT",
        },
        required: [true, "Type is required for creating a ledger entry"],
        immutable: true
    }
});


const preventLedgerModification = () => {
    throw new Error("Ledger entries cannot be modified or deleted once created. This is to ensure the integrity of our financial records and maintain accurate transaction history. If you need to make changes to a ledger entry, please create a new entry with the correct information instead of modifying or deleting existing entries.");
}


ledgerSchema.pre("findOneAndUpdate", preventLedgerModification);
ledgerSchema.pre("updateOne", preventLedgerModification);
ledgerSchema.pre("deleteOne", preventLedgerModification);
ledgerSchema.pre("deleteMany", preventLedgerModification);
ledgerSchema.pre("remove", preventLedgerModification);
ledgerSchema.pre("updateMany", preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);
 

const ledgerModel = mongoose.model("ledger", ledgerSchema);

module.exports = ledgerModel;