import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: ""
    },
    about: {
        type: String,
        default: ""
    },
    googleId: {
        type: String,
        default: null,
        sparse: true,
        unique: false
    },
    secretekeytounlockdashboard: {
        type: String,
        default: ""
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isNew: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Update lastLogin and isNew on every save
AdminSchema.pre('save', function (next) {
    if (this.isModified('isVerified') && this.isVerified === true) {
        this.isNew = false;
        this.lastLogin = new Date();
    }
    next();
});

// Method to update last login
AdminSchema.methods.updateLastLogin = function () {
    this.lastLogin = new Date();
    this.isNew = false;
    return this.save();
};

const Admin = mongoose.model("Admin", AdminSchema);

export default Admin;