import { Hono } from "hono";
import pool from "./db.ts"; // Database connection
import { createClient } from "@supabase/supabase-js";

const authRoutes = new Hono();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign-Up Endpoint
authRoutes.post("/signup", async (c) => {
  const body = await c.req.json(); // Parse JSON body
  const { username, email, password, display_name } = body;

  if (!username || !email || !password || !display_name) {
    return c.text("All fields are required", 400);
  }

  try {
    console.log("Received signup request:", {
      username,
      email,
      password,
      display_name,
    });
    // Step 1: Sign up with Supabase Auth and include metadata
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // Add username to metadata
          display_name, // Add display_name to metadata
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

    // Step 3: Dynamically generate actorUri and inboxUrl based on the request host
    const host = c.req.header("host"); // Get the host from the request headers
    const protocol = c.req.header("x-forwarded-proto") || "http"; // Handle reverse proxy scenarios

    const actorUri = `${protocol}://${host}/users/${username}`;
    const actorHandle = `${username}@${host}`;
    const inboxUrl = `${protocol}://${host}/users/${username}/inbox`;
    const shared_inbox_url = `${protocol}://${host}/inbox`;
    const url = `${protocol}://${host}/users/${username}`; // URL for the actor
    // Step 4: Insert actor using display_name from metadata
    await pool.query(
      `INSERT INTO actors (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [authUserId, actorUri, actorHandle, display_name, inboxUrl, shared_inbox_url, url]
    );

    return c.json({
      message: "User and actor created successfully",
      userId: userResult.rows[0].id,
    });
  } catch (error) {
    console.error("Error during signup:", (error as Error).message);
    return c.text("Failed to create user and actor", 500);
  }
});

export default authRoutes;
