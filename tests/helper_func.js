const Blog = require("../models/blogs");
const User = require("../models/user");
const supertest = require("supertest");
const app = require("../app");
const api = supertest(app);
const bcrypt = require("bcrypt");
const { newUser, newBlogPost3 } = require("./dummyTestData");

const initialTestFunc = async () => {
  await User.deleteMany({});
  await Blog.deleteMany({});
  const passwordHash = await bcrypt.hash(newUser.password, 10);
  const myUser = new User({
    username: newUser.username,
    name: newUser.name,
    passwordHash,
  });
  const userSaved = await myUser.save();
  const result = await api
    .post("/api/login")
    .send({ username: newUser.username, password: newUser.password });
  let token = result.body.token;
  const newBlog = new Blog({ ...newBlogPost3, user: userSaved._id.toString() });
  const newBlogId = await newBlog.save();

  return { token, newBlogId };
};

const blogsInDb = async () => {
  const blogs = await Blog.find({});
  return blogs.map((u) => u.toJSON());
};

const usersInDb = async () => {
  const users = await User.find({});
  return users.map((u) => u.toJSON());
};

module.exports = { blogsInDb, usersInDb, initialTestFunc };
