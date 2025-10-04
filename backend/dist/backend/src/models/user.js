"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = void 0;
const mongoose_1 = require("mongoose");
exports.UserSchema = new mongoose_1.Schema({
    username: {
        type: String,
        unique: true,
        sparse: true,
    },
    displayName: {
        type: String,
        unique: false,
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    songs: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Song",
        },
    ],
    confirmed: { type: Boolean },
});
const User = (0, mongoose_1.model)("User", exports.UserSchema);
exports.default = User;
