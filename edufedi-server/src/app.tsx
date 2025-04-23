import { Hono } from "hono";
import pool from "./db.ts"; // Database connection
import { federation } from "@fedify/fedify/x/hono";
import fedi from "./federation.ts"; // Federation logic
import type { User, Actor, Post } from "./schema.ts";
import { cors } from "hono/cors"; // CORS middleware
import authRoutes from "./authRoutes.tsx";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import { Create, Note, PUBLIC_COLLECTION } from "@fedify/fedify"
import { Temporal } from "@js-temporal/polyfill";

const FEDERATION_PROTOCOL = "https"
const FEDERATION_HOST = "edufedi.com";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const app = new Hono();
const allowedOrigins = [
  "http://localhost:3000",
  "https://edufedi-frontend.onrender.com",
  "https://www.edufedi.com",
];
console.log("Active")
// Middleware for federation
app.use("*", federation(fedi, (c) => ({ context: c })));
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

// Auth Routes
app.route("/auth", authRoutes);

// Route: Get user profile
app.get("/users/:username", async (c) => {
  try {
    // if (!(c as any).user) return c.text("Unauthorised", 401);
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
    // if (!(c as any).user) return c.text("Unauthorised", 401);
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
    const ctx = fedi.createContext(c.req.raw, { contextData: undefined });
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
      `INSERT INTO posts (actor_id, content) 
       VALUES ($1, $2) 
       RETURNING *`, // Get the generated ID
      [actor.id, content]
    );
    
    const post = insertResult.rows[0];
    const realUri = ctx.getObjectUri(Note, { 
      identifier: username, 
      id: post.id 
    });
    
    await pool.query(
      `UPDATE posts 
       SET uri = $1, url = $1 
       WHERE id = $2`,
      [realUri.href, post.id]
    );

    // Return the post with the real URI
    post.uri = realUri;
    const note = new Note({
      id: ctx.getObjectUri(Note, { identifier: username, id: post.id }),
      content: post.content,
      published: Temporal.Instant.from(post.created.toISOString()),
      attribution: ctx.getActorUri(username),
      to: PUBLIC_COLLECTION
    });
    
    await ctx.sendActivity(
      { identifier: username },
      "followers",
      new Create({ object: note })
    );

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
    const userId = (c as any).user.id;

    // Get actor_id for this user
    const actorResult = await pool.query(
      `SELECT id FROM actors WHERE user_id = $1`,
      [userId]
    );
    const actor = actorResult.rows[0];
    const result = await pool.query(
      `
      SELECT 
        posts.*,
        users.username,
        actors.name,
        COUNT(likes.post_id) AS like_count,
        MAX(CASE WHEN likes.actor_id = $1 THEN 1 ELSE 0 END) AS liked,
        COUNT(DISTINCT reposts.post_id) AS repost_count,
        MAX(CASE WHEN reposts.actor_id = $1 THEN 1 ELSE 0 END) AS reposted
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON users.id = actors.user_id
      LEFT JOIN likes ON posts.id = likes.post_id
      LEFT JOIN reposts ON posts.id = reposts.post_id
      GROUP BY posts.id, users.username, actors.name
      ORDER BY posts.created DESC
      `,
      [actor.id]
    );
    const posts = result.rows;
    return c.json(posts);
  } catch (error) {
    console.error("Error in /posts handler:", (error as Error).message);
    return c.text("Internal Server Error", 500);
  }
});

// Route: Get a specific post by ID
app.get("/posts/:postId", async (c) => {
  if (!(c as any).user) return c.text("Unauthorised", 401);
  const postId = Number(c.req.param("postId"));
  const userId = (c as any).user.id;

  // Get actor_id for this user
  const actorResult = await pool.query(
    `SELECT id FROM actors WHERE user_id = $1`,
    [userId]
  );
  const actor = actorResult.rows[0];

  const result = await pool.query(
    `
    SELECT
      posts.*,
      users.username,
      actors.name,
      COUNT(DISTINCT likes.post_id)::int AS like_count,
      MAX(CASE WHEN likes.actor_id = $1 THEN 1 ELSE 0 END)::int AS liked,
      COUNT(DISTINCT reposts.post_id)::int AS repost_count,
      MAX(CASE WHEN reposts.actor_id = $1 THEN 1 ELSE 0 END)::int AS reposted
    FROM posts
    JOIN actors ON posts.actor_id = actors.id
    JOIN users ON users.id = actors.user_id
    LEFT JOIN likes ON posts.id = likes.post_id
    LEFT JOIN reposts ON posts.id = reposts.post_id
    WHERE posts.id = $2
    GROUP BY posts.id, users.username, actors.name
    `,
    [actor.id, postId]
  );
  const post = result.rows[0];
  
  if (!post) return c.text("Not found", 404);
  return c.json(post);
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

// Repost a post
app.post("/posts/:postId/repost", async (c) => {
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
      `INSERT INTO reposts (post_id, actor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, actor.id]
  );
  return c.json({ success: true });
});

// Undo repost
app.delete("/posts/:postId/repost", async (c) => {
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
      `DELETE FROM reposts WHERE post_id = $1 AND actor_id = $2`,
      [postId, actor.id]
  );
  return c.json({ success: true });
});

app.post("/posts/:postId/comments", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = Number(c.req.param("postId"));
  const userId = (c as any).user.id;
  const { content } = await c.req.json();

  if (!content || typeof content !== "string" || !content.trim()) {
    return c.text("Invalid content", 400);
  }

  // Get actor_id for this user
  const actorResult = await pool.query(
    `SELECT id FROM actors WHERE user_id = $1`,
    [userId]
  );
  const actor = actorResult.rows[0];
  if (!actor) return c.text("Actor not found", 404);

  await pool.query(
    `INSERT INTO comments (post_id, actor_id, content) VALUES ($1, $2, $3)`,
    [postId, actor.id, content]
  );
  return c.json({ success: true });
});
app.get("/posts/:postId/comments", async (c) => {
  const postId = Number(c.req.param("postId"));
  const result = await pool.query(
    `SELECT comments.*, actors.name, users.username
     FROM comments
     JOIN actors ON comments.actor_id = actors.id
     JOIN users ON actors.user_id = users.id
     WHERE comments.post_id = $1
     ORDER BY comments.created ASC`,
    [postId]
  );
  
  return c.json(result.rows);
});

export default app;
