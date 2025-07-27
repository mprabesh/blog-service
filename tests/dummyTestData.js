const newBlogPost = {
  title: "Photography",
  author: "Vladmir",
  url: "http://picblog.com",
  likes: "12300",
};
const newBlogPost2 = {
  title: "this is fake blog",
  author: "fake person",
  url: "http://fakesite.com",
  likes: "12300",
};
const newBlogPost3 = {
  title: "this is first blog",
  author: "first test author",
  url: "http://fakesite.com",
  likes: "101",
};

let newBlogPostWithNoLikes = {
  title: "How to invest Smartly",
  author: "Roald Dahl",
  url: "http://investtoblog.com",
};

const newUser = {
  username: "prabesh123",
  name: "Prabesh Magar",
  password: "password",
};
const missingTitle = {
  title: "",
  author: "fake person",
  url: "http://fakesite.com",
  likes: "12300",
};
const missingAuthor = {
  title: "",
  author: "fake person",
  url: "http://fakesite.com",
  likes: "12300",
};
let fakeToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1hZ2FycDA3MjMiLCJ1c2VySWQiOiI2NGRjOTc0YTc2YWViZjEzYmExMmRlYWEiLCJpYXQiOjE2OTIxODU5NTh9.bBKOUUj_9B3CLhUjnmpZsbbEiu_aQHzywZS_7zLwXFU";
let invalidToken =
  "eyJhbGciOiJthisisinvalidtokenIkpXVCJ9.eyJ1ththisisinvalidtokenE2OTIxODU5NTh9.bBKOUUjthisisinvalidtoken_7zLwXFU";

module.exports = {
  fakeToken,
  invalidToken,
  missingAuthor,
  missingTitle,
  newBlogPostWithNoLikes,
  newBlogPost,
  newBlogPost2,
  newBlogPost3,
  newUser,
};
