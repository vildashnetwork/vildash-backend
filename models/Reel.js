import mongoose from "mongoose";

const reelsSchema = new mongoose.Schema(
    {
        // Video content
        videoUrl: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            default: "",
        },

        // Creator information
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        creatorName: {
            type: String,
            required: true,
        },
        creatorAvatar: {
            type: String,
            default: "",
        },

        // Content
        caption: {
            type: String,
            default: "",
            maxlength: 2200,
        },
        hashtags: [{
            type: String,
            trim: true,
        }],
        music: {
            type: String,
            default: "",
        },

        // Engagement
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin", // Users who liked the reel
        }],
        likeCount: {
            type: Number,
            default: 0,
        },

        comments: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Admin",
                required: true,
            },
            userName: {
                type: String,
                required: true,
            },
            userAvatar: {
                type: String,
                default: "",
            },
            text: {
                type: String,
                required: true,
                maxlength: 500,
            },
            likes: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Admin",
            }],
            likeCount: {
                type: Number,
                default: 0,
            },
            replies: [{
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
                userName: {
                    type: String,
                    required: true,
                },
                userAvatar: {
                    type: String,
                    default: "",
                },
                text: {
                    type: String,
                    required: true,
                    maxlength: 500,
                },
                likes: [{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Admin",
                }],
                likeCount: {
                    type: Number,
                    default: 0,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            }],
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
        commentCount: {
            type: Number,
            default: 0,
        },

        // Sharing
        shares: {
            type: Number,
            default: 0,
        },

        // Views
        views: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        }],
        viewCount: {
            type: Number,
            default: 0,
        },

        // Status
        isPublished: {
            type: Boolean,
            default: true,
        },
        isPrivate: {
            type: Boolean,
            default: false,
        },

        // Duration
        duration: {
            type: Number, // in seconds
            default: 0,
        },
    },
    { timestamps: true }
);

// Index for better query performance
reelsSchema.index({ createdAt: -1 });
reelsSchema.index({ creator: 1, createdAt: -1 });
reelsSchema.index({ hashtags: 1 });

// Virtual for checking if user liked the reel
reelsSchema.virtual("isLikedByUser").get(function () {
    // This needs to be populated or passed separately
    return false;
});

// Method to toggle like
reelsSchema.methods.toggleLike = async function (userId) {
    const likeIndex = this.likes.indexOf(userId);
    if (likeIndex === -1) {
        this.likes.push(userId);
        this.likeCount += 1;
    } else {
        this.likes.splice(likeIndex, 1);
        this.likeCount -= 1;
    }
    return await this.save();
};

// Method to add comment
reelsSchema.methods.addComment = async function (commentData) {
    this.comments.push(commentData);
    this.commentCount += 1;
    return await this.save();
};

// Method to remove comment
reelsSchema.methods.removeComment = async function (commentId) {
    const comment = this.comments.id(commentId);
    if (comment) {
        comment.remove();
        this.commentCount -= 1;
    }
    return await this.save();
};

// Method to add view
reelsSchema.methods.addView = async function (userId) {
    if (!this.views.includes(userId)) {
        this.views.push(userId);
        this.viewCount += 1;
        await this.save();
    }
    return this;
};

const Reel = mongoose.model("Reel", reelsSchema);

export default Reel;