import mongoose from "mongoose"

const higherSchema = new mongoose.Schema({
    service: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    details: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Higher = mongoose.model("Higher", higherSchema);

export default Higher
