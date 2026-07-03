import mongoose from "mongoose";

const gelarySchema = new mongoose.Schema({
    mediaurl: {
        type: String,
        required: true
    },
    videotype: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    }

}, { timestamps: true });

const Gelary = mongoose.model("Galary", gelarySchema);
export default Gelary;