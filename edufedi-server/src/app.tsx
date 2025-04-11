import { Hono } from "hono";
import pool from "./db.ts"; // Database connection
import { federation } from "@fedify/fedify/x/hono";
import fedi from "./federation.ts"; // Federation logic
import type { User, Actor, Post } from "./schema.ts";
import { cors } from "hono/cors"; // CORS middleware
const app = new Hono();
// Enable CORS for all routes
app.use(
  "/*",
  cors({
    origin: "*", // Allow requests only from your React app
    allowMethods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow cookies and credentials if needed
  })
);
// Middleware for federation
app.use(federation(fedi, () => undefined));

// Route: Get user profile
app.get("/users/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const result = await pool.query(
      `
      SELECT users.*, actors.*
      FROM users
      JOIN actors ON users.id = actors.user_id
      WHERE username = $1
      `,
      [username]
    );
    const user = result.rows[0];
    if (!user) return c.notFound();

    return c.json(user);
  } catch (error) {
    console.error("Error in /users/:username handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});

// Route: Get posts by user
app.get("/users/:username/posts", async (c) => {
  try {
    const username = c.req.param("username");
    const result = await pool.query(
      `
      SELECT posts.*, users.username, actors.name
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON users.id = actors.user_id
      WHERE users.username = $1
      ORDER BY posts.created DESC
      `,
      [username]
    );
    const posts = result.rows;
    return c.json(posts);
  } catch (error) {
    console.error("Error in /users/:username/posts handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});

// Route: Create a new post
app.post("/users/:username/posts", async (c) => {
  try {
    const username = c.req.param("username");
    const formData = await c.req.formData();
    const content = formData.get("content");

    if (!content || typeof content !== "string") {
      return c.text("Invalid content", 400);
    }

    const actorResult = await pool.query(
      `
      SELECT actors.*
      FROM actors
      JOIN users ON users.id = actors.user_id
      WHERE users.username = $1
      `,
      [username]
    );
    const actor = actorResult.rows[0];
    if (!actor) return c.notFound();

    const result = await pool.query(
      `
      INSERT INTO posts (actor_id, content)
      VALUES ($1, $2)
      RETURNING *
      `,
      [actor.id, content]
    );
    const post = result.rows[0];
    return c.json(post);
  } catch (error) {
    console.error("Error in /users/:username/posts handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});

// Route: Get followers of a user
app.get("/users/:username/followers", async (c) => {
  try {
    const username = c.req.param("username");
    const result = await pool.query(
      `
      SELECT followers.*
      FROM follows
      JOIN actors AS followers ON follows.follower_id = followers.id
      JOIN actors AS following ON follows.following_id = following.id
      JOIN users ON users.id = following.user_id
      WHERE users.username = $1
      ORDER BY follows.created DESC
      `,
      [username]
    );
    const followers = result.rows;
    return c.json(followers);
  } catch (error) {
    console.error("Error in /users/:username/followers handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});
// Route: Get all posts on the server sorted by latest
app.get("/posts", async (c) => {
  try {
    const result = await pool.query(
      `
      SELECT posts.*, users.username, actors.name
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON users.id = actors.user_id
      ORDER BY posts.created DESC
      `
    );
    const posts = result.rows;
    return c.json(posts);
  } catch (error) {
    console.error("Error in /posts handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});
export default app;
