const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  blogImage: { type: String, required: true },
  blogTitle: { type: String, required: true },
  subTitle: { type: String, required: true },
  author: { type: String, required: true } ,
  category: { type: String, required: true } ,
  likes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] } ,  // store user IDs or IPs
  comments: [commentSchema],
}, { timestamps: true });

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);

