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
  const { username, name, email, password } = req.body;
  
  // Validate password length
  if (password.length < 3) {
    return res.status(400).json({
      error: "Password is shorter than the minimum allowed length (3).",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: "Please enter a valid email address.",
    });
  }

  const saltRounds = 10;

  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = new User({ 
      username, 
      name, 
      email: email.toLowerCase(), // Ensure email is stored in lowercase
      passwordHash 
    });
    const result = await newUser.save();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = userRoute;
