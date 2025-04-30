import { Hono } from "hono";
import Cookies from "cookies"; // Import cookie middleware
import pool from "./db.ts"; // Database connection
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { get } from "http";
import { cors } from "hono/cors";
import { generateCryptoKeyPair, exportJwk } from "@fedify/fedify";
const authRoutes = new Hono();
const allowedOrigins = [
  "http://localhost:3000",
  "https://edufedi-frontend.onrender.com",
  "https://www.edufedi.com",
  "https://edufedi.com",
];
const FEDERATION_PROTOCOL = "https"
const FEDERATION_HOST = "edufedi.com";
authRoutes.use("*", async (c, next) => {
  cors({
      origin: allowedOrigins,
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["Set-Cookie"] // Add this
    })
  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }
  await next();
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const JWT_SECRET = process.env.JWT_SECRET!; // Ensure you have a JWT secret in your environment variables
// Sign-Up Endpoint
authRoutes.post("/signup", async (c) => {
  const body = await c.req.json();
  const { username, email, password, display_name } = body;

  if (!username || !email || !password || !display_name) {
    return c.text("All fields are required", 400);
  }

  try {

    // Step 1: Sign up with Supabase Auth and include metadata
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name,
        },
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError.message);
      return c.text(authError.message, 400);
    }

    const authUserId = authUser.user?.id;

    if (!authUserId) {
      return c.text("Failed to retrieve user ID from Supabase Auth", 500);
    }

    // Step 2: Insert user into your custom users table
    const userResult = await pool.query(
      `INSERT INTO users (id, username, email, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [authUserId, username, email]
    );

    const actorUri = `${FEDERATION_PROTOCOL}://${FEDERATION_HOST}/users/${username}`;
    const actorHandle = `${username}@${FEDERATION_HOST}`;
    const inboxUrl = `${FEDERATION_PROTOCOL}://${FEDERATION_HOST}/users/${username}/inbox`;
    const shared_inbox_url = `${FEDERATION_PROTOCOL}://${FEDERATION_HOST}/inbox`;
    const url = `${FEDERATION_PROTOCOL}://${FEDERATION_HOST}/users/${username}`;

    // Step 4: Insert actor using display_name from metadata
    await pool.query(
      `INSERT INTO actors (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [authUserId, actorUri, actorHandle, display_name, inboxUrl, shared_inbox_url, url]
    );


    // Generate and store keys
    const keyTypes = ["RSASSA-PKCS1-v1_5", "Ed25519"] as const;
    for (const keyType of keyTypes) {
      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      await pool.query(
        `INSERT INTO keys (user_id, type, private_key, public_key)
        VALUES ($1, $2, $3, $4)`,
        [
          authUserId,
          keyType,
          JSON.stringify(await exportJwk(privateKey)),
          JSON.stringify(await exportJwk(publicKey)),
        ]
      );
    }
    return c.json({
      message: "User and actor created successfully",
      userId: userResult.rows[0].id,
    });
  } catch (error) {
    console.error("Error during signup:", (error as Error).message);
    return c.text("Failed to create user and actor", 500);
  }
});

// Login Endpoint
authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const origin = c.req.header("origin");
  const isLocalHost = origin && origin.includes("http://localhost");
  const { email, password } = body;
  if (!email || !password) {
    return c.text("Email and password are required", 400);
  }

  try {
    const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Error during login:", authError.message);
      return c.text("Invalid email or password", 401);
    }

    const user = authUser.user;
    if (!user) {
      return c.text("User not found", 404);
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });

    // Set the token as a secure HTTP-only cookie
    setCookie(c, "session_token", token, {
      httpOnly: true,
      secure: !isLocalHost,
      sameSite: isLocalHost ? "Lax" : "None", // 'None' for cross-site
      maxAge: 3600,
      path: "/",
      domain: isLocalHost ? undefined : ".edufedi.com" // Allow subdomains
    });

    
    return c.json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", (error as Error).message);
    return c.text("Failed to log in", 500);
  }
});

// Logout Endpoint
authRoutes.post("/logout", async (c) => {
  try {
    deleteCookie(c, "session_token");
    return c.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", (error as Error).message);
    return c.text("Failed to log out", 500);
  }
});

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, "session_token");
  if (!token) return c.text("Unauthorized", 401);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const userId = decoded.id;
    const result = await pool.query(
      `SELECT users.id, users.username, actors.name
       FROM users
       JOIN actors ON actors.user_id = users.id
       WHERE users.id = $1`,
      [userId]
    );    
    const user = result.rows[0];
    if (!user) return c.text("User not found", 404);
    return c.json({ user });
  } catch {
    return c.text("Unauthorized", 401);
  }
});
// Delete Account Endpoint
authRoutes.delete("/delete-account", async (c) => {
  const token = getCookie(c, "session_token");
  if (!token) return c.text("Unauthorized", 401);

  try {
    // Decode JWT to get user ID
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const userId = decoded.id;

    // Delete all files in user's storage path
    let allFiles = [];
    let hasMore = true;
    let page = 0;
    
    while (hasMore) {
      console.log(`Fetching files for user ${userId}, page ${page}`);
      const { data: fileList, error: listError } = await supabaseAdmin.storage
        .from('research-papers-edufedi')
        .list(`user_${userId}`, {
          limit: 100,
          offset: page * 100
        });

      if (listError) {
        console.error("List files error:", listError);
        break;
      }

      if (fileList?.length > 0) {
        allFiles.push(...fileList);
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allFiles.length > 0) {
      // Add user directory path to each filename
      const filesToDelete = allFiles.map(file => `user_${userId}/${file.name}`);
      
      const { error: deleteError } = await supabaseAdmin.storage
        .from('research-papers-edufedi')
        .remove(filesToDelete);
    
      if (deleteError) {
        console.error("File deletion failed:", deleteError);
        return c.text("Failed to delete files", 500);
      }
    }
    // Delete user from Supabase Auth
    const { error: supabaseError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (supabaseError) {
      console.error("Supabase Auth deletion failed:", supabaseError.message);
      return c.text("Failed to delete auth user", 500);
    }
    // Delete user from your users table
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    // Remove session cookie
    deleteCookie(c, "session_token");

    return c.json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("Error deleting account:", (error as Error).message);
    return c.text("Failed to delete account", 500);
  }
});

export default authRoutes;
