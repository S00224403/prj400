import { Hono } from "hono";
import { federation } from "@fedify/fedify/x/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";
import pool from "./db.ts";
import { stringifyEntities } from "stringify-entities";
import type { Actor, Post, User } from "./schema.ts";
import { Note } from "@fedify/fedify";
import {
  FollowerList,
  Home,
  Layout,
  PostPage,  
  Profile,
  SetupForm,
} from "./views.tsx";
const logger = getLogger("edufedi");

const app = new Hono();
app.use(federation(fedi, () => undefined))

app.get("/", async (c) => {
  try {
    // Query the database to get the user and actor data
    const result = await pool.query(
      `
      SELECT users.*, actors.*
      FROM users
      JOIN actors ON users.id = actors.user_id
      LIMIT 1
      `
    );

    const user = result.rows[0]; // Get the first row from the query result

    if (user == null) return c.redirect("/setup");

    // Render the home page with the user data
    return c.html(
      <Layout>
        <Home user={user} />
      </Layout>
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in / handler:", error.message);
    } else {
      console.error("Error in / handler:", String(error));
    }
    return c.text("Internal Server Error", 500); // Return a proper HTTP response for debugging purposes
  }
});

app.get("/setup", async (c) => {
  try {
    // Query the database to check if the user already exists
    const result = await pool.query(
      `
      SELECT *
      FROM users
      JOIN actors ON (users.id = actors.user_id)
      LIMIT 1
      `
    );
    const user = result.rows[0]; // Get the first row from the query result

    if (user != null) return c.redirect("/");

    // Render the setup form if no user exists
    return c.html(
      <Layout>
        <SetupForm />
      </Layout>
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in /setup handler:", error.message);
    } else {
      console.error("Error in /setup handler:", String(error));
    }
    return c.text("Internal Server Error", 500); // Return a proper HTTP response for debugging purposes
  }
});
//#region Account setup handlers

app.post("/setup", async (c) => {
  try {
    // Check if an account already exists
    const result = await pool.query(
      `
      SELECT * FROM users
      JOIN actors ON (users.id = actors.user_id)
      LIMIT 1
      `
    );
    const user = result.rows[0];
    if (user != null) return c.redirect("/");

    // Get form data
    const form = await c.req.formData();
    const username = form.get("username");
    if (typeof username !== "string" || !username.match(/^[a-z0-9_-]{1,50}$/)) {
      return c.redirect("/setup");
    }
    const name = form.get("name");
    if (typeof name !== "string" || name.trim() === "") {
      return c.redirect("/setup");
    }
    console.log("Form data:", {
      username: form.get("username"),
      name: form.get("name"),
    });

    // Generate actor details
    const url = new URL(c.req.url);
    const handle = `@${username}@${url.host}`;
    const ctx = fedi.createContext(c.req.raw, undefined);

    const client = await pool.connect(); // Connect to the PostgreSQL database

    try {
      await client.query("BEGIN"); // Start a transaction

      // Insert or update the user record
      await client.query(
        `
        INSERT INTO users (id, username)
        VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
        `,
        [username]
      );

      // Insert or update the actor record
      await client.query(
        `
        INSERT INTO actors (user_id, uri, handle, name, inbox_url, shared_inbox_url, url)
        VALUES (1, $1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          uri = EXCLUDED.uri,
          handle = EXCLUDED.handle,
          name = EXCLUDED.name,
          inbox_url = EXCLUDED.inbox_url,
          shared_inbox_url = EXCLUDED.shared_inbox_url,
          url = EXCLUDED.url
        `,
        [
          ctx.getActorUri(username).href,
          handle,
          name,
          ctx.getInboxUri(username).href,
          ctx.getInboxUri().href,
          ctx.getActorUri(username).href,
        ]
      );

      await client.query("COMMIT"); // Commit the transaction
    } catch (e) {
      await client.query("ROLLBACK"); // Rollback the transaction on error
      throw e; // Rethrow the error for logging and debugging
    } finally {
      client.release(); // Release the database connection back to the pool
    }

    return c.redirect("/");
  } catch (error) {
    if (error instanceof Error) {
        logger.error(`Error in /setup handler: ${error.message} ${error.stack}`);
    } else {
        logger.error(`Error in /setup handler: ${String(error)}`);
    }
    return c.text("Internal Server Error", 500); // Return a proper HTTP response for debugging purposes
  }
});
//#endregion Account setup handlers
app.get("/users/:username", async (c) => {
    const result = await pool.query(
        `
        SELECT * FROM users
        JOIN actors ON (users.id = actors.user_id)
        WHERE username = $1
        `,
        [c.req.param("username")]
    );
    const user = result.rows[0];
    if (user == null) return c.notFound();

    const followersResult = await pool.query(
      `
      SELECT count(*) AS followers
      FROM follows
      JOIN actors ON follows.following_id = actors.id
      WHERE actors.id = $1
      `,
      [user.id] // Use parameterized query to prevent SQL injection
    );
    
    const followers = followersResult.rows[0]?.followers; // Extract the count of followers
    const url = new URL(c.req.url);
    const handle = `@${user.username}@${url.host}`;
    return c.html(
      <Layout>
        <Profile
          name={user.name ?? user.username}
          username={user.username}
          handle={handle}
          followers={followers}
        />
      </Layout>,
    );
});

app.get("/users/:username/followers", async (c) => {
  try {
    // Query the database to get the followers of the user
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
      [c.req.param("username")] // Use parameterized query to prevent SQL injection
    );

    const followers = result.rows; // Get the rows from the query result

    // Render the follower list page with the retrieved followers
    return c.html(
      <Layout>
        <FollowerList followers={followers} />
      </Layout>
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in /users/:username/followers handler:", error.message);
    } else {
      console.error("Error in /users/:username/followers handler:", String(error));
    }
    return c.text("Internal Server Error", 500); // Return a proper HTTP response for debugging purposes
  }
});

app.post("/users/:username/posts", async (c) => {
  try {
    const username = c.req.param("username");

    // Query the database to get the actor associated with the username
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
    if (actor == null) return c.redirect("/setup");

    // Get form data and validate content
    const form = await c.req.formData();
    const content = form.get("content")?.toString();
    if (content == null || content.trim() === "") {
      return c.text("Content is required", 400);
    }

    const ctx = fedi.createContext(c.req.raw, undefined);

    let url: string | null = null;

    // Start a transaction to insert the post and update its URI and URL
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert the post into the database
      const postResult = await client.query(
        `
        INSERT INTO posts (uri, actor_id, content)
        VALUES ('https://localhost/', $1, $2)
        RETURNING *
        `,
        [actor.id, stringifyEntities(content, { escapeOnly: true })]
      );
      const post = postResult.rows[0];
      if (post == null) {
        await client.query("ROLLBACK");
        return c.text("Failed to create post", 500);
      }

      // Generate the URI and URL for the post
      url = ctx.getObjectUri(Note, {
        identifier: username,
        id: post.id.toString(),
      }).href;

      // Update the post with its URI and URL
      await client.query(
        `
        UPDATE posts
        SET uri = $1, url = $2
        WHERE id = $3
        `,
        [url, url, post.id]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (url == null) return c.text("Failed to create post", 500);
    return c.redirect(url);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in /users/:username/posts handler:", error.message);
    } else {
      console.error("Error in /users/:username/posts handler:", String(error));
    }
    return c.text("Internal Server Error", 500);
  }
});
app.get("/users/:username/posts/:id", async (c) => {
  try {
    // Query the database to fetch the post along with actor and user data
    const postResult = await pool.query(
      `
      SELECT users.*, actors.*, posts.*
      FROM posts
      JOIN actors ON actors.id = posts.actor_id
      JOIN users ON users.id = actors.user_id
      WHERE users.username = $1 AND posts.id = $2
      `,
      [c.req.param("username"), c.req.param("id")] // Use parameterized queries to prevent SQL injection
    );
    const post = postResult.rows[0]; // Get the first row from the query result

    if (post == null) return c.notFound();

    // Query the database to count followers for the actor associated with the post
    const followersResult = await pool.query(
      `
      SELECT count(*) AS followers
      FROM follows
      WHERE follows.following_id = $1
      `,
      [post.actor_id] // Use parameterized queries to prevent SQL injection
    );
    const followers = followersResult.rows[0]?.followers ?? 0; // Extract the count of followers or default to 0

    // Render the post page with the retrieved data
    return c.html(
      <Layout>
        <PostPage
          name={post.name ?? post.username}
          username={post.username}
          handle={post.handle}
          followers={followers}
          post={post}
        />
      </Layout>
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in /users/:username/posts/:id handler:", error.message);
    } else {
      console.error("Error in /users/:username/posts/:id handler:", String(error));
    }
    return c.text("Internal Server Error", 500); // Return a proper HTTP response for debugging purposes
  }
});

export default app;