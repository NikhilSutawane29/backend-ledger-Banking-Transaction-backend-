
const mongoose = require("mongoose");


const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to blacklist"],
        unique: [true, "Token is already blacklisted"],
    }
}, {
    timestamps: true,
})


tokenBlacklistSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 3 }); // here we are creating an index on the createdAt field of the tokenBlacklistSchema and setting the expireAfterSeconds option to 3 days (60 seconds * 60 minutes * 24 hours * 3 days). This means that any document in the token blacklist collection will automatically be removed from the database after it has been in the collection for 3 days. This is useful for managing the size of the token blacklist collection and ensuring that old tokens that are no longer relevant are automatically cleaned up from the database.


const tokenBlacklistModel = mongoose.model("tokenBlacklist", tokenBlacklistSchema);

module.exports = tokenBlacklistModel;

