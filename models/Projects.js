import mongoose from "mongoose";

const projectschema = new mongoose.Schema(
    {
        imageurls: {
            type: [String],
            required: true
        },
        title: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        solutions: {
            type: String,
            required: true
        },
        urllink: {
            type: String,
            required: true
        },
        technologies: {
            type: [String],
            required: true
        },
        visibility: {
            type: Boolean,
            default: false
        }
    },
    { timestamp: true }
);


const projectsmodel = mongoose.model("Projects", projectschema);

export default projectsmodel;