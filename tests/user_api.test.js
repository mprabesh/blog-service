const mongoose = require("mongoose");
const supertest = require("supertest");
const bcrypt = require("bcrypt");
const { usersInDb } = require("./helper_func");
const app = require("../app");
const User = require("../models/user");
const api = supertest(app);

describe("when there is one user initially in the db", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash("sekret", 10);
    const user = new User({ username: "root", name: "rootUser", passwordHash });
    await user.save();
  });

  test("creation of the user suceeds", async () => {
    const userAtStart = await usersInDb();

    const newUser = {
      username: "mluukkai",
      name: "Matti Luukkainen",
      password: "salainen",
    };

    await api
      .post("/api/users")
      .send(newUser)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await usersInDb();
    expect(usersAtEnd).toHaveLength(userAtStart.length + 1);
  });
  test("minLength of username is 3", async () => {
    const newUser = {
      username: "ap",
      name: "apple",
      password: "password",
    };
    const result = await api.post("/api/users").send(newUser);
    expect(result.status).toBe(400);
    expect(result.body.error).toBe(
      "User validation failed: username: Path `username` (`ap`) is shorter than the minimum allowed length (3)."
    );
  });
  test("unique username is maintained in db", async () => {
    const newUser = {
      username: "root",
      name: "apple",
      password: "password",
    };
    await api.post("/api/users").send(newUser).expect(400);
  });
  test("empty username is invalid", async () => {
    const newUser = {
      username: "",
      name: "apple",
      password: "pass",
    };
    const result = await api.post("/api/users").send(newUser);
    expect(result.status).toBe(400);
    expect(result.body.error).toBe(
      "User validation failed: username: Path `username` is required."
    );
  });
  test("empty password is invalid", async () => {
    const newUser = {
      username: "apple123",
      name: "apple",
      password: "",
    };
    const result = await api.post("/api/users").send(newUser);
    expect(result.status).toBe(403);
    expect(result.body.error).toBe(
      "`password` is shorter than the minimum allowed length (3)."
    );
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
