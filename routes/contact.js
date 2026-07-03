import express from "express";
import Contact from "../models/contact.js";
import axios from "axios";

const router = express.Router();

// ==================== CONFIGURATION ====================
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@vildashnetwork.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://vildashnetwork.com";

// Brand Colors
const BRAND_BLUE = "#0066FF";
const BRAND_DARK = "#0A0A0A";
const BRAND_LIGHT = "#E8F0FE";

// Banner Image URL (VILDASH NETWORK banner)
const BANNER_IMAGE = "https://via.placeholder.com/600x200/0066FF/FFFFFF?text=VILDASH+NETWORK";

// ==================== GET all contact messages ====================
router.get("/", async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET a single contact message by ID ====================
router.get("/:id", async (req, res) => {
    try {
        const message = await Contact.findById(req.params.id);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }
        res.status(200).json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== CREATE a new contact message ====================
router.post("/", async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Check for spam (same user sending too many messages)
        const recentMessages = await Contact.find({
            email: email,
            createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        });

        if (recentMessages.length >= 5) {
            return res.status(429).json({
                success: false,
                message: "Too many messages sent. Please try again later."
            });
        }

        const newMessage = new Contact({
            name,
            email,
            phone: phone || "",
            subject: subject || "",
            message
        });

        const savedMessage = await newMessage.save();
        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: savedMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== DELETE a contact message ====================
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await Contact.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Message deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== DELETE all contact messages ====================
router.delete("/delete/all", async (req, res) => {
    try {
        const result = await Contact.deleteMany({});
        res.status(200).json({
            success: true,
            message: `${result.deletedCount} messages deleted successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET messages by email ====================
router.get("/email/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const messages = await Contact.find({
            email: { $regex: new RegExp(email, "i") }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET messages by name ====================
router.get("/name/:name", async (req, res) => {
    try {
        const { name } = req.params;
        const messages = await Contact.find({
            name: { $regex: new RegExp(name, "i") }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET messages with pagination ====================
router.get("/paginated/all", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const messages = await Contact.find()
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Contact.countDocuments();

        res.json({
            success: true,
            messages,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== SEARCH messages ====================
router.get("/search/:keyword", async (req, res) => {
    try {
        const keyword = req.params.keyword;
        const messages = await Contact.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
                { message: { $regex: keyword, $options: "i" } },
                { subject: { $regex: keyword, $options: "i" } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET message statistics ====================
router.get("/stats/summary", async (req, res) => {
    try {
        const totalMessages = await Contact.countDocuments();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayMessages = await Contact.countDocuments({
            createdAt: { $gte: today }
        });

        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const lastWeekMessages = await Contact.countDocuments({
            createdAt: { $gte: lastWeek }
        });

        const unreadMessages = await Contact.countDocuments({ read: false });
        const repliedMessages = await Contact.countDocuments({ replied: true });

        // Get unique senders
        const uniqueSenders = await Contact.distinct("email");

        res.status(200).json({
            success: true,
            data: {
                totalMessages,
                todayMessages,
                lastWeekMessages,
                unreadMessages,
                repliedMessages,
                uniqueSenders: uniqueSenders.length,
                averageMessagesPerSender: (totalMessages / uniqueSenders.length).toFixed(2)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== MARK message as read ====================
router.patch("/:id/read", async (req, res) => {
    try {
        const message = await Contact.findById(req.params.id);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        message.read = true;
        message.readAt = new Date();
        await message.save();

        res.status(200).json({
            success: true,
            message: "Message marked as read",
            data: { read: message.read, readAt: message.readAt }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== MARK multiple messages as read ====================
router.patch("/read/bulk", async (req, res) => {
    try {
        const { messageIds } = req.body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of message IDs"
            });
        }

        const result = await Contact.updateMany(
            { _id: { $in: messageIds } },
            { read: true, readAt: new Date() }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} messages marked as read`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== SEND REPLY EMAIL (Brevo) ====================
const sendReplyEmail = async (toEmail, toName, subject, message, replyToEmail) => {
    try {
        const url = "https://api.brevo.com/v3/smtp/email";
        const BRAND_BLUE = "#0066FF";
        const BRAND_GOLD = "#F5A623";
        const BRAND_DARK = "#0A0A0A";
        const BANNER_URL = "https://via.placeholder.com/600x200/0066FF/FFFFFF?text=VILDASH+NETWORK";

        const emailContent = {
            sender: { name: "VILDASH NETWORK Support", email: SUPPORT_EMAIL },
            replyTo: { email: replyToEmail || SUPPORT_EMAIL, name: "VILDASH NETWORK Support" },
            to: [{ email: toEmail, name: toName || "Valued Customer" }],
            subject: subject || "Re: Your VILDASH NETWORK Inquiry",
            htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fe; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Banner Image -->
            <div style="background: ${BRAND_BLUE}; padding: 0;">
              <img src="${BANNER_URL}" alt="VILDASH NETWORK" style="width: 100%; height: auto; display: block;" />
            </div>
            
            <!-- Header Section -->
            <div style="background: ${BRAND_BLUE}; color: white; padding: 20px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">VILDASH NETWORK</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Innovation Starts Here. Technology That Works.</p>
            </div>
            
            <!-- Content Section -->
            <div style="padding: 40px 30px; color: #333;">
              <p style="font-size: 16px; line-height: 1.6;">Dear <strong style="color: ${BRAND_BLUE};">${toName || "Valued Customer"}</strong>,</p>
              
              <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
                Thank you for reaching out to VILDASH NETWORK. We appreciate your interest and have reviewed your inquiry.
              </p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid ${BRAND_BLUE};">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: ${BRAND_BLUE};">📝 Our Response:</p>
                <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              
              <div style="background: #fff9db; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #ffe066;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>💡 Need further assistance?</strong><br>
                  Feel free to reply to this email or contact us directly at 
                  <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_BLUE}; text-decoration: none; font-weight: bold;">${SUPPORT_EMAIL}</a>
                </p>
              </div>
              
              <!-- Quick Links -->
              <div style="text-align: center; margin: 30px 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                <a href="${FRONTEND_URL}/products" 
                   style="display: inline-block; background: ${BRAND_BLUE}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  Our Products
                </a>
                <a href="${FRONTEND_URL}/services" 
                   style="display: inline-block; background: ${BRAND_DARK}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  Our Services
                </a>
                <a href="${FRONTEND_URL}/contact" 
                   style="display: inline-block; background: ${BRAND_GOLD}; color: ${BRAND_DARK}; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  Contact Us
                </a>
              </div>
              
              <hr style="margin: 30px 0 20px; border: none; border-top: 1px solid #e0e0e0;">
              
              <div style="text-align: center;">
                <p style="font-size: 12px; color: #999; margin: 0;">
                  © ${new Date().getFullYear()} VILDASH NETWORK. All rights reserved.<br>
                  A Subsidiary of Blissz Concept Group Ltd
                </p>
                <p style="font-size: 11px; color: #bbb; margin: 5px 0 0 0;">
                  This is an automated response from our support system.
                </p>
              </div>
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

        console.log(`✅ Reply email sent to ${toEmail}`);
        return response.data;
    } catch (error) {
        console.error("❌ Failed to send reply email:", error.response?.data || error.message);
        throw error;
    }
};

// ==================== POST - Send a reply to a contact message ====================
router.post("/reply", async (req, res) => {
    try {
        const { contactId, subject, message, replyToEmail } = req.body;

        // Validate required fields
        if (!contactId || !message) {
            return res.status(400).json({
                success: false,
                message: "Contact ID and message are required"
            });
        }

        // Find the contact message in database
        const contact = await Contact.findById(contactId);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact message not found"
            });
        }

        // Send the email reply
        await sendReplyEmail(
            contact.email,
            contact.name || "Valued Customer",
            subject || `Re: ${contact.subject || "Your VILDASH NETWORK Inquiry"}`,
            message,
            replyToEmail || SUPPORT_EMAIL
        );

        // Update the contact record to mark as replied
        contact.replied = true;
        contact.repliedAt = new Date();
        contact.replyMessage = message;
        contact.replySubject = subject || `Re: ${contact.subject || "Your Inquiry"}`;
        await contact.save();

        res.status(200).json({
            success: true,
            message: "Reply sent successfully",
            data: {
                replied: contact.replied,
                repliedAt: contact.repliedAt,
                replyMessage: contact.replyMessage,
                replySubject: contact.replySubject
            }
        });

    } catch (error) {
        console.error("Error sending reply:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send reply"
        });
    }
});

// ==================== GET replied messages ====================
router.get("/replied/all", async (req, res) => {
    try {
        const messages = await Contact.find({ replied: true })
            .sort({ repliedAt: -1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET unread messages ====================
router.get("/unread/all", async (req, res) => {
    try {
        const messages = await Contact.find({ read: false })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;