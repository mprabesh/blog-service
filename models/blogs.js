const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  url: String,
  likes: Number,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});
mongoose.Schema.Types.ObjectId,
  blogSchema.set("toJSON", {
    transform: (document, returnedObj) => {
      returnedObj.id = returnedObj._id.toString();
      delete returnedObj._id;
      delete returnedObj.__v;
    },
  });

module.exports = mongoose.model("Blog", blogSchema);
