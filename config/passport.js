// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                // Use the static method to find or create user
                const user = await User.findOrCreateGoogleUser(profile);

                if (!user) {
                    return done(null, false, { message: "Failed to create/find user" });
                }

                // Update last login
                await user.updateLastLogin();

                return done(null, user);
            } catch (err) {
                console.error("Google Strategy Error:", err);
                return done(err, null);
            }
        }
    )
);

// Serialize user - store only user ID in session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user - retrieve full user object from database
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        console.error("Deserialize error:", err);
        done(err, null);
    }
});

export default passport;