import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Admin from "../models/Admins.js";
import axios from "axios";
import env from "dotenv"
env.config()

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const SECRET_KEY = "vildashnetworkallinone-123";

// ==================== CONFIGURATION ====================
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@vildashnetwork.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://vildashnetwork.com";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Brand Colors
const BRAND_BLUE = "#0066FF";
const BRAND_GOLD = "#F5A623";
const BRAND_DARK = "#0A0A0A";
const BANNER_IMAGE = "https://via.placeholder.com/600x200/0066FF/FFFFFF?text=VILDASH+NETWORK";

// ==================== PASSPORT GOOGLE STRATEGY ====================
passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'http://localhost:2200'}/api/admin/auth/google/callback`,
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName;
                const avatar = profile.photos?.[0]?.value;
                const googleId = profile.id;

                if (!email) {
                    return done(new Error("No email found from Google"), null);
                }

                // Check if admin exists
                let admin = await Admin.findOne({ email });

                if (!admin) {
                    // Create new admin with Google data (not verified yet)
                    const randomPassword = Math.random().toString(36).slice(-12);
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(randomPassword, salt);

                    admin = new Admin({
                        name: name || email.split('@')[0],
                        email,
                        password: hashedPassword,
                        avatar: avatar || "",
                        googleId: googleId,
                        secretekeytounlockdashboard: null,
                        isVerified: false,
                        about: "Google OAuth user"
                    });

                    await admin.save();
                } else {
                    // Update Google ID if not set
                    if (!admin.googleId) {
                        admin.googleId = googleId;
                        await admin.save();
                    }
                }

                return done(null, admin);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await Admin.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// ==================== HELPER FUNCTIONS ====================

// Send welcome email using Brevo
const sendWelcomeEmail = async (email, name) => {
    try {
        const url = "https://api.brevo.com/v3/smtp/email";

        const emailContent = {
            sender: { name: "VILDASH NETWORK", email: SUPPORT_EMAIL },
            to: [{ email: email, name: name || "Admin" }],
            subject: "Welcome to VILDASH NETWORK Admin Dashboard",
            htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fe; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <div style="background: ${BRAND_BLUE}; padding: 0;">
              <img src="${BANNER_IMAGE}" alt="VILDASH NETWORK" style="width: 100%; height: auto; display: block;" />
            </div>
            
            <div style="background: ${BRAND_BLUE}; color: white; padding: 20px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to VILDASH NETWORK</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Admin Dashboard Access Granted</p>
            </div>
            
            <div style="padding: 40px 30px; color: #333;">
              <p style="font-size: 16px; line-height: 1.6;">Dear <strong style="color: ${BRAND_BLUE};">${name || "Admin"}</strong>,</p>
              
              <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
                Welcome to the VILDASH NETWORK Admin Dashboard. You now have access to manage:
              </p>
              
              <ul style="font-size: 16px; line-height: 2; padding-left: 20px;">
                <li>Dashboard Analytics</li>
                <li>Reels Management</li>
                <li>Projects Gallery</li>
                <li>Applicants</li>
                <li>Service Orders</li>
                <li>Team Contributions</li>
              </ul>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid ${BRAND_BLUE};">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>Secret Key:</strong> vildashnetworkallinone-123
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                  Use this key to unlock your dashboard.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${FRONTEND_URL}/dashboard" 
                   style="display: inline-block; background: ${BRAND_BLUE}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
              
              <hr style="margin: 30px 0 20px; border: none; border-top: 1px solid #e0e0e0;">
              
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                Copyright ${new Date().getFullYear()} VILDASH NETWORK. All rights reserved.<br>
                A Subsidiary of Blissz Concept Group Ltd
              </p>
            </div>
          </div>
        </div>
      `
        };

        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log(`Welcome email sent to ${email}`);
        return response.data;
    } catch (error) {
        console.error("Failed to send welcome email:", error.response?.data || error.message);
        throw error;
    }
};

// Generate JWT token
const generateToken = (admin) => {
    return jwt.sign(
        {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: "admin",
            isVerified: admin.isVerified || false
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// ==================== GOOGLE OAUTH ROUTES ====================

// Step 1: Initiate Google Login
router.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

// Step 2: Google Callback
router.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: `${FRONTEND_URL}/login-failed`,
        session: true
    }),
    async (req, res) => {
        try {
            const admin = req.user;

            // Generate JWT token
            const token = generateToken(admin);

            // Check if admin is verified (has secret key)
            if (!admin.isVerified) {
                // Redirect to secret key verification page with temp token
                const redirectUrl = `${FRONTEND_URL}/verify-secret?adminId=${admin._id}&tempToken=${token}`;
                return res.redirect(redirectUrl);
            }

            // Admin is already verified, redirect to dashboard
            const redirectUrl = `${FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`;
            return res.redirect(redirectUrl);
        } catch (error) {
            console.error("Google callback error:", error);
            return res.redirect(`${FRONTEND_URL}/login-failed`);
        }
    }
);

// ==================== ROUTES ====================

// ==================== REGISTER (Create Admin) ====================
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, avatar, about, secretKey } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        if (!secretKey || secretKey !== SECRET_KEY) {
            return res.status(401).json({
                success: false,
                message: "Invalid secret key. Access denied."
            });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new Admin({
            name,
            email,
            password: hashedPassword,
            avatar: avatar || "",
            about: about || "",
            secretekeytounlockdashboard: SECRET_KEY,
            isVerified: true
        });

        await admin.save();

        const token = generateToken(admin);

        res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                avatar: admin.avatar,
                about: admin.about,
                isVerified: admin.isVerified
            },
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== LOGIN (Email/Password) ====================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!admin.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Account not verified. Please enter your secret key.",
                requiresSecretKey: true,
                adminId: admin._id
            });
        }

        const token = generateToken(admin);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                avatar: admin.avatar,
                about: admin.about,
                isVerified: admin.isVerified
            },
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== VERIFY SECRET KEY ====================
router.post("/verify-secret", async (req, res) => {
    try {
        const { adminId, secretKey } = req.body;

        if (!adminId || !secretKey) {
            return res.status(400).json({
                success: false,
                message: "Admin ID and secret key are required"
            });
        }

        if (secretKey !== SECRET_KEY) {
            return res.status(401).json({
                success: false,
                message: "Invalid secret key. Access denied."
            });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        admin.isVerified = true;
        admin.secretekeytounlockdashboard = SECRET_KEY;
        await admin.save();

        try {
            await sendWelcomeEmail(admin.email, admin.name);
        } catch (emailError) {
            console.error("Welcome email failed:", emailError);
        }

        const token = generateToken(admin);

        res.status(200).json({
            success: true,
            message: "Secret key verified. Admin access granted.",
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                avatar: admin.avatar,
                about: admin.about,
                isVerified: admin.isVerified
            },
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET Current Admin (Protected) ====================
router.get("/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const admin = await Admin.findById(decoded.id).select("-password -__v");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            data: admin
        });
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== UPDATE Admin Profile ====================
router.put("/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const { name, avatar, about } = req.body;

        const admin = await Admin.findByIdAndUpdate(
            decoded.id,
            { name, avatar, about },
            { new: true, runValidators: true }
        ).select("-password -__v");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: admin
        });
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== CHANGE Password ====================
router.put("/change-password", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        const admin = await Admin.findById(decoded.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== FORGOT Password ====================
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin with this email not found"
            });
        }

        const resetToken = jwt.sign(
            { id: admin._id, email: admin.email },
            JWT_SECRET + admin.password,
            { expiresIn: "1h" }
        );

        const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

        const emailContent = {
            sender: { name: "VILDASH NETWORK", email: SUPPORT_EMAIL },
            to: [{ email: admin.email, name: admin.name }],
            subject: "Password Reset Request - VILDASH NETWORK",
            htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fe; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background: ${BRAND_BLUE}; color: white; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Password Reset</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p>Dear <strong>${admin.name}</strong>,</p>
              <p>You requested to reset your password for the VILDASH NETWORK Admin Dashboard.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: ${BRAND_BLUE}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </div>
      `
        };

        await axios.post("https://api.brevo.com/v3/smtp/email", emailContent, {
            headers: {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json"
            }
        });

        res.status(200).json({
            success: true,
            message: "Password reset link sent to your email"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== RESET Password ====================
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Token and new password are required"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== LOGOUT ====================
router.post("/logout", async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET All Admins (Protected) ====================
router.get("/admins", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const currentAdmin = await Admin.findById(decoded.id);
        if (!currentAdmin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const admins = await Admin.find().select("-password -__v");

        res.status(200).json({
            success: true,
            count: admins.length,
            data: admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== DELETE Admin ====================
router.delete("/:id", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.id === req.params.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        const admin = await Admin.findByIdAndDelete(req.params.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Admin deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;