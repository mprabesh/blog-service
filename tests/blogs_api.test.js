const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app");
const Blog = require("../models/blogs");
const api = supertest(app);
const { blogsInDb, initialTestFunc } = require("./helper_func");
const {
  invalidToken,
  missingAuthor,
  missingTitle,
  newBlogPostWithNoLikes,
  newBlogPost,
  newBlogPost2,
} = require("./dummyTestData");

let token, firstBlog;
beforeEach(async () => {
  const initVariable = await initialTestFunc();
  token = initVariable.token;
  firstBlog = initVariable.newBlogId._id.toString();
});

describe("adding a new blog", () => {
  test("a new blog is added & verify adding blog increases number of blogs by 1", async () => {
    const initialBlogsList = await blogsInDb();
    const response = await api
      .post("/api/blogs")
      .set("authorization", `Bearer ${token}`)
      .send(newBlogPost);
    expect(response.status).toBe(200);
    //after adding new blog
    let finalBlogList = await blogsInDb();
    expect(finalBlogList).toHaveLength(initialBlogsList.length + 1);
  });

  test("fails if jwt token is not provided", async () => {
    await api.post("/api/blogs").send(newBlogPost2).expect(401);
  });

  test("fails if invalid jwt is provided", async () => {
    await api
      .post("/api/blogs")
      .set("authorization", `Bearer ${invalidToken}`)
      .send(newBlogPost)
      .expect(401);
  });
});

describe("validation testing for blogs", () => {
  test("verify request object with no likes keyword adds likes to 0", async () => {
    const response = await api
      .post("/api/blogs")
      .set("authorization", `Bearer ${token}`)
      .send(newBlogPostWithNoLikes);
    expect(response.body.likes).toBe(0);
  });
  test("verify missing title results status code 400", async () => {
    const newBlog = new Blog(missingTitle);
    const response = await api
      .post("/api/blogs")
      .set("authorization", `Bearer ${token}`)
      .send(newBlog);
    expect(response.status).toBe(400);
  });
  test("verify missing author results status code 400", async () => {
    const newBlog = new Blog(missingAuthor);
    const response = await api
      .post("/api/blogs")
      .set("authorization", `Bearer ${token}`)
      .send(newBlog);
    expect(response.status).toBe(400);
  });
});

describe("GET request tests", () => {
  test("blogs are returned as JSON", async () => {
    await api
      .get("/api/blogs")
      .expect(200)
      .expect("Content-Type", /application\/json/);
  });

  // test for the excercise 4.8
  test("the unique identifier property of the blog posts is named id", async () => {
    const response = await api.get("/api/blogs");
    response.body.map((val) => {
      expect(val.id).toBeDefined();
    });
  });
});

describe("PUT request tests", () => {
  test("successfully gets updated", async () => {
    await api
      .put("/api/blogs/" + firstBlog)
      .set("authorization", `Bearer ${token}`)
      .send({
        title: "this is updated blog",
        author: "first update author",
        url: "http://updatesite.com",
        likes: "100001",
      });
    const afterUpdateResult = await blogsInDb();
    expect(afterUpdateResult[0].title).toBe("this is updated blog");
    expect(afterUpdateResult[0].author).toBe("first update author");
    expect(afterUpdateResult[0].url).toBe("http://updatesite.com");
    expect(afterUpdateResult[0].likes).toBe(100001);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
