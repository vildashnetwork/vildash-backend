import mongoose from "mongoose";

const workSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    imageurl: {
        type: [String],
        required: true
    },
    link: {
        type: String,
        required: true
    }
},
    { timestamps: true });

const works = mongoose.model("Works", workSchema);

export default works;