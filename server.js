import mongoose from "mongoose";
import express from "express";
import env from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import morgan from "morgan";
import MongoStore from "connect-mongo";
import axios from "axios";

// importation of all routes
import admins from "./routes/admins.js";
import contact from "./routes/contact.js";
import gallery from "./routes/gallery.js";
import higher from "./routes/higher.js"
import join from "./routes/join.js"
import projects from "./routes/projects.js"
import reels from "./routes/reels.js"
import works from "./routes/works.js"


// Passport configuration
import "./config/passport.js";


env.config();

const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
const PORT = process.env.PORT || 2200;
const FRONTEND = process.env.FRONTEND_URL;

// CORS configuration
app.use(cors({
    origin: [
        "https://www.vildashnetwork.com",
        "https://dashboard.vildashnetwork.com",
        "https://vildash-elevate.vercel.app",
        "https://vildash-hub-aqyh.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));
app.use(express.urlencoded({ extended: true }));

// Session configuration (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET || "your_session_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGOURI,
        collectionName: "sessions"
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production", // Use secure in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/admins", admins)
app.use("/api/contact", contact)
app.use("/api/gallery", gallery)
app.use("/api/join", join)
app.use("/api/projects", projects)
app.use("/api/reels", reels)
app.use("/api/works", works)


// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "API is working",
        timestamp: new Date()
    });
});

const sendBrevoEmail = async (email, name) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        // VILDASH NETWORK Branding Constants
        const BRAND_BLUE = "#0066FF";
        const BRAND_GOLD = "#F5A623";
        const BRAND_DARK = "#0A0A0A";
        const BANNER_URL = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000";

        const emailContent = {
            sender: { name: "VILDASH NETWORK Support", email: process.env.SUPPORT_EMAIL || "support@vildashnetwork.com" },
            to: [{ email: email, name: name || "Valued Customer" }],
            subject: "Welcome to VILDASH NETWORK",
            htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fe; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                
                <!-- Banner Image -->
                <div style="background: url('${BANNER_URL}') center/cover; height: 180px; position: relative;">
                    <div style="background: linear-gradient(to bottom, rgba(0,102,255,0.8), ${BRAND_BLUE}); position: absolute; inset: 0;"></div>
                    <div style="position: relative; padding: 40px; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 700;">VILDASH NETWORK</h1>
                        <p style="color: ${BRAND_GOLD}; margin: 5px 0 0 0; font-size: 14px; letter-spacing: 4px;">Innovation Starts Here</p>
                    </div>
                </div>

                <!-- Content Section -->
                <div style="padding: 40px 30px; color: #1e293b;">
                    <h2 style="color: ${BRAND_BLUE}; margin-top: 0; font-size: 24px;">Welcome, ${name || "Valued Customer"}!</h2>
                    <p style="line-height: 1.8; font-size: 16px; color: #475569;">
                        You are now part of VILDASH NETWORK, a leading software and technology company dedicated to building innovative digital solutions that transform businesses, education, communities, and everyday life.
                    </p>
                    
                    <div style="background: #f8fafc; border-left: 4px solid ${BRAND_BLUE}; padding: 20px; margin: 25px 0; border-radius: 4px;">
                        <p style="margin: 0; font-style: italic; color: #475569; font-size: 15px;">
                            "Technology is more than software. It is a powerful tool for empowerment, economic growth, innovation and sustainable development."
                        </p>
                        <p style="margin: 10px 0 0 0; color: ${BRAND_BLUE}; font-weight: 600; font-size: 14px;">
                            - VILDASH NETWORK Team
                        </p>
                    </div>

                    <!-- Quick Links -->
                    <div style="display: flex; flex-direction: column; gap: 10px; margin: 25px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://vildashnetwork.com'}/dashboard" 
                           style="display: block; text-align: center; background: ${BRAND_BLUE}; color: #ffffff; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                           Access Your Dashboard
                        </a>
                        <a href="${process.env.FRONTEND_URL || 'https://vildashnetwork.com'}/products" 
                           style="display: block; text-align: center; background: ${BRAND_DARK}; color: #ffffff; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                           Explore Our Products
                        </a>
                    </div>

                    <!-- Products Section -->
                    <div style="margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px;">
                        <h3 style="color: ${BRAND_BLUE}; margin-top: 0; font-size: 16px;">Our Products</h3>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center;">
                                <span style="display: inline-block; width: 8px; height: 8px; background: ${BRAND_BLUE}; border-radius: 50%; margin-right: 10px;"></span>
                                <span style="color: #475569;"><strong>Vizit</strong> - Property discovery platform</span>
                            </li>
                            <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center;">
                                <span style="display: inline-block; width: 8px; height: 8px; background: ${BRAND_BLUE}; border-radius: 50%; margin-right: 10px;"></span>
                                <span style="color: #475569;"><strong>GC Smart</strong> - Digital management system</span>
                            </li>
                            <li style="padding: 8px 0; display: flex; align-items: center;">
                                <span style="display: inline-block; width: 8px; height: 8px; background: ${BRAND_BLUE}; border-radius: 50%; margin-right: 10px;"></span>
                                <span style="color: #475569;"><strong>WICIKI</strong> - Digital collaboration platform</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Contact Section -->
                    <div style="background: #fff9db; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #ffe066;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            <strong>Need help?</strong><br>
                            Our support team is here for you. Contact us at 
                            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@vildashnetwork.com'}" style="color: ${BRAND_BLUE}; text-decoration: none; font-weight: 600;">
                                ${process.env.SUPPORT_EMAIL || 'support@vildashnetwork.com'}
                            </a>
                        </p>
                    </div>
                    
                    <!-- Footer -->
                    <hr style="margin: 30px 0 20px; border: none; border-top: 1px solid #e2e8f0;">
                    
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.6;">
                        Copyright ${new Date().getFullYear()} VILDASH NETWORK. All rights reserved.<br>
                        A Subsidiary of Blissz Concept Group Ltd<br>
                        <span style="font-size: 11px; color: #cbd5e1;">Headquartered in Cameroon</span>
                    </p>
                </div>
            </div>
        </div>
      `
        };

        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        console.log(`Welcome email sent to ${email}`);
        return response.data;
    } catch (error) {
        console.error("Email failed to send:", error.response?.data || error.message);
        throw error;
    }
};

// Google OAuth routes
// Google OAuth routes
app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

app.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: `${FRONTEND}/login-failed`,
        session: true
    }),
    async (req, res) => { // Make sure to add 'async' here
        try {
            // Generate JWT token
            const token = jwt.sign(
                {
                    id: req.user._id,
                    email: req.user.email,
                    name: req.user.name
                },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            //  CALL THE EMAIL FUNCTION HERE (for new users only)
            // Check if user is new (you can add a flag in your user model)
            const isNewUser = req.user.isNew || !req.user.lastLogin;

            if (isNewUser) {
                // Send welcome email asynchronously (don't await to not block response)
                sendBrevoEmail(req.user.email, req.user.name).catch(err =>
                    console.error("Background email failed:", err)
                );
            }

            // Redirect to frontend with token
            const redirectUrl = `${FRONTEND}/?token=${encodeURIComponent(token)}`;
            return res.redirect(redirectUrl);
        } catch (jwtErr) {
            console.error("JWT generation error:", jwtErr);
            return res.redirect(`${FRONTEND}/`);
        }
    }
);

// Database connection
const connectdb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGOURI);
        console.log(`Database connection successful: ${conn.connection.host}`);
    } catch (error) {
        console.log('====================================');
        console.log(`Error: ${error.message}`);
        console.log('====================================');
        process.exit(1);
    }
};

connectdb().then(() => {
    app.listen(PORT, () => {
        console.log('====================================');
        console.log(`Server running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
        console.log('====================================');
    });
});