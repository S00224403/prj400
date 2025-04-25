import { Hono } from "hono";
import pool from "./db.ts"; // Database connection
import { federation } from "@fedify/fedify/x/hono";
import fedi from "./federation.ts"; // Federation logic
import type { User, Actor, Post } from "./schema.ts";
import { cors } from "hono/cors"; // CORS middleware
import authRoutes from "./authRoutes.tsx";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";
import { Announce, Create, Like, Note, PUBLIC_COLLECTION, Undo } from "@fedify/fedify"
import { Temporal } from "@js-temporal/polyfill";
import { createSignature } from "./signature.ts";
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const FEDERATION_PROTOCOL = "https"
const FEDERATION_HOST = "edufedi.com";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const app = new Hono();
const allowedOrigins = [
  "http://localhost:3000",
  "https://edufedi-frontend.onrender.com",
  "https://www.edufedi.com",
  "https://edufedi.com",
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
app.route("/api/auth", authRoutes);

// Route: Get user profile
app.get("api/users/:username", async (c) => {
  try {
    // if (!(c as any).user) return c.text("Unauthorised", 401);
    const username = c.req.param("username");
    const result = await pool.query(
      `
      SELECT
        users.*, 
        actors.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = actors.id) AS follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = actors.id) AS following_count,
        (SELECT COUNT(*) FROM posts WHERE actor_id = actors.id) AS post_count
      FROM users
      JOIN actors ON actors.user_id = users.id
      WHERE users.username = $1

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

app.get("/api/users/:username/posts", async (c) => {
  try {
    const viewedUsername = c.req.param("username");
    if (!viewedUsername) return c.text("Username required", 400);

    // Get logged-in user's actor ID (if authenticated)
    let loggedInActorId = null;
    if ((c as any).user) {
      const actorResult = await pool.query(
        "SELECT id FROM actors WHERE user_id = $1",
        [(c as any).user.id]
      );
      loggedInActorId = actorResult.rows[0]?.id;
    }
    const result = await pool.query(
      `
      SELECT 
        posts.*,
        users.username,
        actors.name,
        COALESCE(
          (SELECT json_agg(json_build_object('id', id, 'file_url', file_url, 'file_type', file_type))
          FROM attachments WHERE post_id = posts.id),
          '[]'::json
        ) AS attachments,
        (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count,
        (SELECT COUNT(*) FROM reposts WHERE post_id = posts.id) AS repost_count,
        (SELECT EXISTS (
          SELECT 1 FROM likes 
          WHERE post_id = posts.id 
          AND actor_id = $2
        )) AS liked,
        (SELECT EXISTS (
          SELECT 1 FROM reposts 
          WHERE post_id = posts.id 
          AND actor_id = $2
        )) AS reposted
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON users.id = actors.user_id
      WHERE users.username = $1
      ORDER BY posts.created DESC
      `,
      [viewedUsername, loggedInActorId] // $1=viewed user, $2=logged-in user
    );
    return c.json(result.rows);
  } catch (error) {
    console.error("Error in /users/:username/posts handler:", error);
    return c.text("Internal Server Error", 500);
  }
});
// Route: Upload a file
app.post("/api/upload", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return c.text("Invalid file", 400);

  // Accept only doc, docx, pdf
  const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type)) return c.text("File type not allowed", 400);

  try {
    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    // Convert File to Buffer for Node.js
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('research-papers')
      .upload(filename, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    // Return public URL
    const url = supabase.storage
      .from('research-papers')
      .getPublicUrl(filename).data.publicUrl;

    return c.json({ url });
    
  } catch (error) {
    console.error("Upload failed:", error);
    return c.text("Upload failed", 500);
  }
});
// Route: Create a new post
app.post("/api/users/:username/posts", async (c) => {
  try {
    if (!(c as any).user) return c.text("Unauthorised", 401);
    const username = c.req.param("username");
    const formData = await c.req.formData();
    const content = formData.get("content");
    const file = formData.get("file"); // Use "file" as field name
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
    const actorUri = ctx.getActorUri(username);
    const createActivity = new Create({
      actor: actorUri,  // Explicitly set actor
      object: new Note({
        id: ctx.getObjectUri(Note, { identifier: username, id: post.id }),
        content: post.content,
        published: Temporal.Instant.from(post.created.toISOString()),
        attribution: actorUri,  
        to: PUBLIC_COLLECTION
      })
    });

    await ctx.sendActivity(
      { identifier: username },
      "followers",
      createActivity  // Send the fully-configured Create activity
    );
    // Handle attachment if present
    if (file instanceof File) {
      const extension = file.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      
      // Convert to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Upload with error handling
      const { data, error } = await supabase.storage
        .from('research-papers-edufedi')
        .upload(filename, fileBuffer, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return c.text("File upload failed", 500);
      }

      // Use getPublicUrl() for proper URL
      const { data: urlData } = supabase.storage
        .from('research-papers-edufedi')
        .getPublicUrl(filename);

      await pool.query(
        `INSERT INTO attachments (post_id, file_url, file_type) 
        VALUES ($1, $2, 'document')`,
        [post.id, urlData.publicUrl]
      );
    }
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
app.get("/api/posts", async (c) => {
  try {
    if (!(c as any).user) return c.text("Unauthorized", 401);
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
        (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count,
        (SELECT COUNT(*) FROM reposts WHERE post_id = posts.id) AS repost_count,
        (SELECT EXISTS (SELECT 1 FROM likes WHERE post_id = posts.id AND actor_id = $1)) AS liked,
        (SELECT EXISTS (SELECT 1 FROM reposts WHERE post_id = posts.id AND actor_id = $1)) AS reposted,
        COALESCE(
          (SELECT json_agg(json_build_object('id', id, 'file_url', file_url, 'file_type', file_type))
          FROM attachments WHERE post_id = posts.id),
          '[]'::json
        ) AS attachments
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON users.id = actors.user_id
      ORDER BY posts.created DESC
      `,
      [actor.id]
    );

    return c.json(result.rows);
  } catch (error) {
    console.error("Error in /posts handler:", error);
    return c.text("Internal Server Error", 500);
  }
});

// Route: Get a specific post by ID
app.get("/api/posts/:postId", async (c) => {
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
        COALESCE(
          (SELECT json_agg(json_build_object('id', id, 'file_url', file_url, 'file_type', file_type))
          FROM attachments WHERE post_id = posts.id),
          '[]'::json
        ) AS attachments,
        (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count,
        (SELECT COUNT(*) FROM reposts WHERE post_id = posts.id) AS repost_count,
        (SELECT EXISTS (SELECT 1 FROM likes WHERE post_id = posts.id AND actor_id = $1)) AS liked,
        (SELECT EXISTS (SELECT 1 FROM reposts WHERE post_id = posts.id AND actor_id = $1)) AS reposted
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON users.id = actors.user_id
    WHERE posts.id = $2
    `,
    [actor.id, postId]
  );  
  const post = result.rows[0];
  
  if (!post) return c.text("Not found", 404);
  return c.json(post);
});

// Like a post
app.post("/api/posts/:postId/like", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = Number(c.req.param("postId")); // Convert to number
  const userId = (c as any).user.id;

  const [actorResult, postResult, keyResult] = await Promise.all([
    pool.query("SELECT * FROM actors WHERE user_id = $1", [userId]),
    pool.query("SELECT * FROM posts WHERE id = $1", [postId]),
    pool.query("SELECT private_key FROM keys WHERE user_id = $1 AND type = 'RSASSA-PKCS1-v1_5'", [userId])
  ]);
  
  const actor = actorResult.rows[0];
  const post = postResult.rows[0];
  const privateKey = keyResult.rows[0]?.private_key;
  if (!actor || !post || !privateKey) return c.text("Not found", 404);

  const like = new Like({
    id: new URL(`${post.uri}#like-${Date.now()}`),
    actor: new URL(actor.uri),
    object: new URL(post.uri),
    to: PUBLIC_COLLECTION,
    published: Temporal.Instant.from(new Date().toISOString())
  });

  const parsed = new URL(post.uri);
  const inbox = `${parsed.protocol}//${parsed.hostname}/inbox`;
  
  await fetch(inbox, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json",
      "Signature": await createSignature(like, { private_key: privateKey }),
    },
    body: JSON.stringify(like),
  });

  await pool.query(
    `INSERT INTO likes (post_id, actor_id, activity_uri)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [postId, actor.id, like.id?.href] // Use numeric postId
  );
  
  return c.json({ success: true });
});

// DELETE /api/posts/:postId/like
app.delete("/api/posts/:postId/like", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = Number(c.req.param("postId"));
  const userId = (c as any).user.id;

  // Get actor's integer ID first
  const actorResult = await pool.query(
    "SELECT * FROM actors WHERE user_id = $1",
    [userId]
  );
  const actorId = actorResult.rows[0]?.id;
  if (!actorId) return c.text("Actor not found", 404);

  const [likeResult, keyResult] = await Promise.all([
    pool.query(
      `SELECT activity_uri FROM likes 
       WHERE post_id = $1 AND actor_id = $2`,
      [postId, actorId] // Use actor's integer ID
    ),
    pool.query("SELECT private_key FROM keys WHERE user_id = $1 AND type = 'RSASSA-PKCS1-v1_5'", [userId])
  ]);
  
  const actor = actorResult.rows[0];
  const like = likeResult.rows[0];
  const privateKey = keyResult.rows[0]?.private_key;
  if (!actor || !like || !privateKey) return c.text("Not found", 404);

  const undo = new Undo({
    id: new URL(`${like.activity_uri}#undo`),
    actor: new URL(actor.uri),
    object: new URL(like.activity_uri),
    to: PUBLIC_COLLECTION,
    published: Temporal.Instant.from(new Date().toISOString())
  });

  const parsed = new URL(like.activity_uri);
  const inbox = `${parsed.protocol}//${parsed.hostname}/inbox`;
  
  await fetch(inbox, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json",
      "Signature": await createSignature(undo, { private_key: privateKey }),
    },
    body: JSON.stringify(undo),
  });

  await pool.query(
    `DELETE FROM likes WHERE post_id = $1 AND actor_id = $2`,
    [postId, actor.id]
  );
  
  return c.json({ success: true });
});

// Repost a post
app.post("/api/posts/:postId/repost", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = c.req.param("postId");
  const userId = (c as any).user.id;

  const [actorResult, postResult, keyResult] = await Promise.all([
    pool.query("SELECT * FROM actors WHERE user_id = $1", [userId]),
    pool.query("SELECT * FROM posts WHERE id = $1", [postId]),
    pool.query("SELECT private_key FROM keys WHERE user_id = $1 AND type = 'RSASSA-PKCS1-v1_5'", [userId])
  ]);
  
  const actor = { ...actorResult.rows[0], private_key: keyResult.rows[0]?.private_key };
  const post = postResult.rows[0];
  if (!actor || !post) return c.text("Not found", 404);

  // Create Announce activity
  const repost = new Announce({
    id: new URL(`${post.uri}#boost-${Date.now()}`),
    actor: new URL(actor.uri),
    object: new URL(post.uri),
    to: PUBLIC_COLLECTION,
    published: Temporal.Instant.from(new Date().toISOString())
  });

  // Send to original post's inbox
  const parsed = new URL(post.uri);
  const inbox = `${parsed.protocol}//${parsed.hostname}/inbox`;
  
  await fetch(inbox, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json",
      "Signature": await createSignature(repost, actor),
    },
    body: JSON.stringify(repost),
  });

  // Store locally
  await pool.query(
    `INSERT INTO reposts (post_id, actor_id, activity_uri)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [postId, actor.id, repost.id?.href]
  );
  
  return c.json({ success: true });
});

// Undo repost
app.delete("/api/posts/:postId/repost", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const postId = c.req.param("postId");
  const userId = (c as any).user.id;

  // Get actor's integer ID first
  const actorResult = await pool.query(
    "SELECT * FROM actors WHERE user_id = $1",
    [userId]
  );
  const actorId = actorResult.rows[0]?.id;
  if (!actorId) return c.text("Actor not found", 404);

  const [repostResults, keyResult] = await Promise.all([
    pool.query(
      `SELECT activity_uri FROM reposts 
       WHERE post_id = $1 AND actor_id = $2`,
      [postId, actorId] // Use integer ID here
    ),
    pool.query(
      "SELECT private_key FROM keys WHERE user_id = $1 AND type = 'RSASSA-PKCS1-v1_5'",
      [userId]
    )
  ]);

  const repost = repostResults.rows[0];
  const privateKey = keyResult.rows[0]?.private_key;
  if (!repost || !privateKey) return c.text("Not found", 404);

  const actorUri = `${process.env.FEDERATION_HOST}/users/${(c as any).user.username}`;
  const undo = new Undo({
    id: new URL(`${repost.activity_uri}#undo`),
    actor: new URL(actorResult.rows[0].uri),
    object: new URL(repost.activity_uri),
    to: PUBLIC_COLLECTION,
    published: Temporal.Instant.from(new Date().toISOString())
  });

  const parsed = new URL(repost.activity_uri);
  const inbox = `${parsed.protocol}//${parsed.hostname}/inbox`;
  
  await fetch(inbox, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json",
      "Signature": await createSignature(undo, { private_key: privateKey }),
    },
    body: JSON.stringify(undo),
  });

  await pool.query(
    `DELETE FROM reposts WHERE post_id = $1 AND actor_id = $2`,
    [postId, actorId] // Use integer ID here
  );
  
  return c.json({ success: true });
});

app.post("/api/posts/:postId/comments", async (c) => {
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
app.get("/api/posts/:postId/comments", async (c) => {
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

// Follow a user
app.post("/api/users/:username/follow", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const targetUsername = c.req.param("username");
  const followerId = (c as any).user.id;

  try {
    // Get target user's actor ID
    const targetResult = await pool.query(
      `SELECT actors.id 
       FROM actors 
       JOIN users ON actors.user_id = users.id 
       WHERE users.username = $1`,
      [targetUsername]
    );
    
    if (targetResult.rows.length === 0) return c.text("User not found", 404);

    // Get follower's actor ID
    const followerResult = await pool.query(
      `SELECT id FROM actors WHERE user_id = $1`,
      [followerId]
    );

    await pool.query(
      `INSERT INTO follows (following_id, follower_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [targetResult.rows[0].id, followerResult.rows[0].id]
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Error following user:", error);
    return c.text("Internal Server Error", 500);
  }
});

// Unfollow a user
app.delete("/api/users/:username/unfollow", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const targetUsername = c.req.param("username");
  const followerId = (c as any).user.id;

  try {
    const targetResult = await pool.query(
      `SELECT actors.id 
       FROM actors 
       JOIN users ON actors.user_id = users.id 
       WHERE users.username = $1`,
      [targetUsername]
    );
    
    if (targetResult.rows.length === 0) return c.text("User not found", 404);

    const followerResult = await pool.query(
      `SELECT id FROM actors WHERE user_id = $1`,
      [followerId]
    );

    await pool.query(
      `DELETE FROM follows 
       WHERE following_id = $1 AND follower_id = $2`,
      [targetResult.rows[0].id, followerResult.rows[0].id]
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return c.text("Internal Server Error", 500);
  }
});

// Check follow status
app.get("/api/users/:username/follow-status", async (c) => {
  if (!(c as any).user) return c.text("Unauthorized", 401);
  const targetUsername = c.req.param("username");
  const userId = (c as any).user.id; // This is a UUID

  try {
    // First get the actor ID for the current user (follower)
    const followerActorResult = await pool.query(
      `SELECT id FROM actors WHERE user_id = $1`,
      [userId] // userId is UUID
    );
    
    if (followerActorResult.rows.length === 0) {
      return c.text("Follower actor not found", 404);
    }
    
    const followerActorId = followerActorResult.rows[0].id; // This is an integer

    // Then check the follow status using the integer actor IDs
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM follows
        JOIN actors AS following ON follows.following_id = following.id
        JOIN users ON following.user_id = users.id
        WHERE users.username = $1 AND follows.follower_id = $2
      )`,
      [targetUsername, followerActorId] // followerActorId is now an integer
    );

    return c.json({ isFollowing: result.rows[0].exists });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return c.text("Internal Server Error", 500);
  }
});

// Search for users and posts
app.get("/api/search", async (c) => {
  const query = c.req.query("q")?.trim();
  if (!query) return c.json({ users: [], posts: [] });

  try {
    // Search users
    const users = await pool.query(`
      SELECT 
        users.username,
        actors.name,
        actors.url
      FROM users
      JOIN actors ON users.id = actors.user_id
      WHERE 
        users.username ILIKE $1 OR
        actors.name ILIKE $1
      LIMIT 5
    `, [`%${query}%`]);

    // Search posts
    const posts = await pool.query(`
      SELECT 
        posts.id,
        posts.content,
        posts.created,
        users.username,
        actors.name
      FROM posts
      JOIN actors ON posts.actor_id = actors.id
      JOIN users ON actors.user_id = users.id
      WHERE posts.content ILIKE $1
      ORDER BY posts.created DESC
      LIMIT 10
    `, [`%${query}%`]);

    return c.json({
      users: users.rows,
      posts: posts.rows
    });
  } catch (error) {
    console.error("Search error:", error);
    return c.text("Search failed", 500);
  }
});

export default app;
