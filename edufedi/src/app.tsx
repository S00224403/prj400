import { Hono } from "hono";
import { federation } from "@fedify/fedify/x/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";
import { Layout, Profile, SetupForm } from "./views.tsx";
import pool from "./db.ts";
import type { Actor, User } from "./schema.ts";
const logger = getLogger("edufedi");

const app = new Hono();
app.use(federation(fedi, () => undefined))

app.get("/", (c) => c.text("Hello, Fedify!"));
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

    const url = new URL(c.req.url);
    const handle = `@${user.username}@${url.host}`;
    return c.html(
        <Layout>
            <Profile name={user.name ?? user.username} handle={handle} />
        </Layout>,
    );
});
export default app;