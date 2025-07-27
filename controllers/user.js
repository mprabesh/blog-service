const userRoute = require("express").Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");

userRoute.get("/", async (req, res, next) => {
  try {
    const result = await User.find({}).populate("blogs");
    console.log(result);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

userRoute.post("/", async (req, res, next) => {
  const { username, name, password } = req.body;
  if (password.length < 3) {
    res.status(403).json({
      error: "`password` is shorter than the minimum allowed length (3).",
    });
  }
  const saltRounds = 10;

  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = new User({ username, name, passwordHash });
    const result = await newUser.save();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = userRoute;
