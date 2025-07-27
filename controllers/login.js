const loginRoute = require("express").Router();
const BlogUser = require("../models/user");
const bcrypt = require("bcrypt");
const { SECRET_KEY } = require("../utils/config");
const jwt = require("jsonwebtoken");

loginRoute.post("/", async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const user = await BlogUser.findOne({ username });
    const passwordCorrect =
      user === null ? false : await bcrypt.compare(password, user.passwordHash);
    if (!(passwordCorrect && user)) {
      res.status(401).json({ error: "wrong username or password" });
    }
    const tokenForUser = {
      username: user.username,
      userId: user._id,
    };
    const token = jwt.sign(tokenForUser, SECRET_KEY, { expiresIn: "45m" });
    res.status(200).json({ username: user.username, name: user.name, token });
  } catch (err) {
    next(err);
  }
});

module.exports = loginRoute;
