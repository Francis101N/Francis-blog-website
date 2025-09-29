const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  blogImage: { type: String, required: true },
  blogTitle: { type: String, required: true },
  subTitle: { type: String, required: true },
  author: { type: String, required: true } ,
  category: { type: String, required: true } 
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
