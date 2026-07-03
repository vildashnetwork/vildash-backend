
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: ""
    },
    subject: {
        type: String,
        default: ""
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    replied: {
        type: Boolean,
        default: false
    },
    repliedAt: {
        type: Date
    },
    replyMessage: {
        type: String
    },
    replySubject: {
        type: String
    }
}, {
    timestamps: true
});

const Contact = mongoose.model("Contact", contactSchema);
export default Contact;