import mongoose from "mongoose"

const JoinSchema = new mongoose.Schema({
    firstName:{
        type: String,
        required: true
    },
    lastName:{
          type: String,
        required: true
    },
    email:{
          type: String,
        required: true
    },
    biolink:{
          type: String,
       default: ""
    },
    docslink:{
          type: String,
        required: true
    },
    letter:{
          type: String,
        required: true
    },
    status:{
        type: String,
        enum: ["pending", "rejected", "accepted"],
        default: "pending"
    }
}, {timestamps: true});

const Join = mongoose.model("Join", JoinSchema);

export default Join