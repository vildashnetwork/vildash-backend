// models/User.js
import mongoose from "mongoose";

const userschema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,  // This already creates an index
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        default: null
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
        sparse: true,  // This creates a sparse index
        unique: false  // Not unique, just sparse for multiple nulls
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// ONLY keep indexes that are NOT already defined in the schema
// email index is already created by unique: true
// googleId index is already created by sparse: true
// So we only need the createdAt index for sorting
userschema.index({ createdAt: -1 });

// Optional: Compound index for common queries
userschema.index({ isActive: 1, createdAt: -1 });

// Virtual for full profile
userschema.virtual('profile').get(function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        about: this.about,
        isVerified: this.isVerified,
        createdAt: this.createdAt
    };
});

// Instance method to get public profile (excludes sensitive data)
userschema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        about: this.about,
        createdAt: this.createdAt
    };
};

// Instance method to update last login
userschema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    return await this.save();
};

// Static method to find or create Google user
userschema.statics.findOrCreateGoogleUser = async function (profile) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
        throw new Error('Email not provided by Google');
    }

    // Try to find existing user
    let user = await this.findOne({ email });

    if (user) {
        // Update googleId if not already set
        if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
        }
        return user;
    }

    // Create new user
    user = await this.create({
        name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
        email: email,
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value || "",
        isVerified: true,
        lastLogin: new Date()
    });

    return user;
};

// Static method to find user by email or googleId
userschema.statics.findByEmailOrGoogleId = async function (email, googleId) {
    return await this.findOne({
        $or: [
            { email: email },
            { googleId: googleId }
        ]
    });
};

const User = mongoose.model("User", userschema);

export default User;