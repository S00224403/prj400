import { Hono } from "hono";
import pool from "./db.ts"; // Database connection
import { federation } from "@fedify/fedify/x/hono";
import fedi from "./federation.ts"; // Federation logic
import type { User, Actor, Post } from "./schema.ts";
import { cors } from "hono/cors"; // CORS middleware
import authRoutes from "./authRoutes.tsx";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const app = new Hono();
const allowedOrigins = [
  "http://localhost:3000",
  "https://edufedi-frontend.onrender.com",
  "https://www.edufedi.com",
];
// Attach user info to context if session_token is present
app.use("*", async (c, next) => {
  const origin = c.req.header("origin");
  if (origin && allowedOrigins.includes(origin)) {
    c.res.headers.set("Access-Control-Allow-Origin", origin);
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
    c.res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    c.res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }
  const token = getCookie(c, "session_token");
  if (token) {
    try {
      // You can type this as needed, e.g. { id: string }
      const decoded = jwt.verify(token, JWT_SECRET);
      // Attach to context (see below for type-safe way)
      (c as any).user = decoded;
    } catch {
      (c as any).user = undefined;
    }
  } else {
    (c as any).user = undefined;
  }
  await next();
});

// Middleware for federation
app.use(federation(fedi, () => undefined));

// Auth Routes
app.route("/auth", authRoutes);

// Route: Get user profile
app.get("/users/:username", async (c) => {
  try {
    if (!(c as any).user) return c.text("Unauthorised", 401);
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
    if (!(c as any).user) return c.text("Unauthorised", 401);
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
    if (!(c as any).user) return c.text("Unauthorised", 401);
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

    // Insert with a placeholder for uri
    const insertResult = await pool.query(
      `
      INSERT INTO posts (actor_id, content, uri)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [actor.id, content, "TEMP"]
    );
    const post = insertResult.rows[0];

    // Generate the real URI
    const domainUrl = c.req.header("host");
    const protocol = c.req.header("x-forwarded-proto") || "http";
    const realUri = `${protocol}://${domainUrl}/${username}/posts/${post.id}`;

    // Update the post with the real URI
    await pool.query(
      `
      UPDATE posts
      SET uri = $1, url = $1
      WHERE id = $2
      `,
      [realUri, post.id]
    );

    // Return the post with the real URI
    post.uri = realUri;
    return c.json(post);
  } catch (error) {
    console.error("Error in /users/:username/posts handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});

// Route: Get followers of a user
app.get("/users/:username/followers", async (c) => {
  try {
    if (!(c as any).user) return c.text("Unauthorised", 401);
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
    if (!(c as any).user) return c.text("Unauthorised", 401);
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

// Like a post
app.post("/posts/:postId/like", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = Number(c.req.param("postId"));
  const userId = (c as any).user.id;

  // Get actor_id for this user
  const actorResult = await pool.query(
    `SELECT id FROM actors WHERE user_id = $1`,
    [userId]
  );
  const actor = actorResult.rows[0];
  if (!actor) return c.text("Actor not found", 404);

  // Insert like (ignore if already exists)
  await pool.query(
    `INSERT INTO likes (post_id, actor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [postId, actor.id]
  );
  return c.json({ success: true });
});

// Unlike a post
app.delete("/posts/:postId/like", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = Number(c.req.param("postId"));
  const userId = (c as any).user.id;

  // Get actor_id for this user
  const actorResult = await pool.query(
    `SELECT id FROM actors WHERE user_id = $1`,
    [userId]
  );
  const actor = actorResult.rows[0];
  if (!actor) return c.text("Actor not found", 404);

  await pool.query(
    `DELETE FROM likes WHERE post_id = $1 AND actor_id = $2`,
    [postId, actor.id]
  );
  return c.json({ success: true });
});

// Get like count and whether the current user liked a post
app.get("/posts/:postId/likes", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = Number(c.req.param("postId"));
  const userId = (c as any).user.id;

  // Get actor_id for this user
  const actorResult = await pool.query(
    `SELECT id FROM actors WHERE user_id = $1`,
    [userId]
  );
  const actor = actorResult.rows[0];

  // Count likes
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM likes WHERE post_id = $1`,
    [postId]
  );
  const likeCount = Number(countResult.rows[0].count);

  // Did this user like it?
  let liked = false;
  if (actor) {
    const likedResult = await pool.query(
      `SELECT 1 FROM likes WHERE post_id = $1 AND actor_id = $2`,
      [postId, actor.id]
    );
    liked = likedResult.rowCount !== null && likedResult.rowCount > 0;
  }

  return c.json({ likeCount, liked });
});

export default app;
