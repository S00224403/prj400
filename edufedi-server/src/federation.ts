import {
    Accept,
    Endpoints,
    Follow,
    Note,
    PUBLIC_COLLECTION,
    Person,
    Undo,
    createFederation,
    exportJwk,
    generateCryptoKeyPair,
    getActorHandle,
    importJwk,
    isActor,                
    type Actor as APActor,  
    type Recipient,
  } from "@fedify/fedify";
  import type {
    Actor,
    Key,
    Post,  
    User,
  } from "./schema.ts";
  import { getLogger } from "@logtape/logtape";
  import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
  import pool from "./db.ts"; // PostgreSQL connection pool
  import { Temporal } from "@js-temporal/polyfill";
  const logger = getLogger("edufedi");
  
  const federation = createFederation({
    kv: new MemoryKvStore(),
    queue: new InProcessMessageQueue(),
    origin: "https://edufedi.com",
  });
  
  federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    try {
      // Query the database for user and actor information
      const result = await pool.query(
        `
        SELECT *
        FROM users
        JOIN actors ON users.id = actors.user_id
        WHERE users.username = $1
        `,
        [identifier]
      );
      
      const user = result.rows[0]; // Get the first row from the query result
      if (user == null) return null; // Return null if no user is found
  
      const keys = await ctx.getActorKeyPairs(identifier); // Fetch key pairs from context
      // Create and return a new Person object based on the query result
      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: identifier,
        name: user.name,
        inbox: ctx.getInboxUri(identifier),
        endpoints: new Endpoints({
          sharedInbox: ctx.getInboxUri(),
        }),
        url: ctx.getActorUri(identifier),
        publicKey: keys[0].cryptographicKey,
        assertionMethods: keys.map((k) => k.multikey),
        followers: ctx.getFollowersUri(identifier),
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error in setActorDispatcher:", error.message);
      } else {
        console.error("Unknown error in setActorDispatcher:", error);
      }
      return null; // Return null if there is an error
    }
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    try {
      const userResult = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [identifier]
      );
      const user = userResult.rows[0];
      if (!user) return [];
  
      const keyTypes = ["RSASSA-PKCS1-v1_5", "Ed25519"] as const;
      const pairs: CryptoKeyPair[] = [];
  
      for (const keyType of keyTypes) {
        let keyRow = (await pool.query(
          "SELECT * FROM keys WHERE user_id = $1 AND type = $2",
          [user.id, keyType]
        )).rows[0];
  
        if (!keyRow) {
          console.log(`Generating ${keyType} keys for ${identifier}...`);
          const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
          await pool.query(
            `INSERT INTO keys (user_id, type, private_key, public_key)
             VALUES ($1, $2, $3, $4)`,
            [
              user.id,
              keyType,
              JSON.stringify(await exportJwk(privateKey)),
              JSON.stringify(await exportJwk(publicKey)),
            ]
          );
          keyRow = { privateKey, publicKey };
        }
  
        pairs.push({
          privateKey: await importJwk(JSON.parse(keyRow.private_key), "private"),
          publicKey: await importJwk(JSON.parse(keyRow.public_key), "public"),
        });
      }
  
      return pairs;
    } catch (error) {
      console.error("Key pair dispatch failed:", error);
      return [];
    }
  });  
  
  federation
    .setInboxListeners("/users/{identifier}/inbox", "/inbox")
    .on(Follow, async (ctx, follow) => {
      console.log("[DEBUG] Received Follow:", follow.id);
      
      try {
        // Verify and parse the Follow's target
        if (follow.objectId == null) {
          console.log("[WARN] Follow activity missing objectId");
          return;
        }
    
        // Safely parse and type-check the URI
        const parsed = ctx.parseUri(follow.objectId);
        if (parsed?.type !== "actor") {
          console.log("[WARN] Follow target is not an actor");
          return;
        }
        const identifier = parsed.identifier;
    
        // Get and persist the follower
        const follower = await follow.getActor();
        if (!follower?.id) {
          console.log("[WARN] Follow activity missing valid actor");
          return;
        }
        const persisted = await persistActor(follower);
        if (!persisted?.id) {
          console.log("[ERROR] Failed to persist follower:", follower.id.href);
          return;
        }
    
        // Find the local user being followed
        const targetUser = await pool.query(
          `SELECT actors.id 
           FROM actors 
           JOIN users ON actors.user_id = users.id 
           WHERE users.username = $1`,
          [identifier]
        );
    
        if (!targetUser.rows[0]?.id) {
          console.log("[WARN] Follow target not found for username:", identifier);
          return;
        }
    
        // Store the follow relationship
        await pool.query(
          `INSERT INTO follows (following_id, follower_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [targetUser.rows[0].id, persisted.id]
        );
    
        // Create Accept activity with proper addressing
        const accept = new Accept({
          actor: ctx.getActorUri(identifier), // Local user's actor URI
          object: follow,
          to: follow.actorId
        });
    
        // Send with explicit sender and recipient
        await ctx.sendActivity(
          { identifier }, // Sender (local user)
          follower,       // Recipient (follower's actor)
          accept          // Activity
        );
    
      } catch (error) {
        console.error("[ERROR] Follow handling failed:", error);
      }
    })      
    .on(Undo, async (ctx, undo) => {
      try {
        const follow = await undo.getObject();
        if (!(follow instanceof Follow)) return;
        if (!follow.objectId || !undo.actorId) return;
        const parsed = ctx.parseUri(follow.objectId);
        if (parsed?.type !== "actor") return;
    
        await pool.query(
          `DELETE FROM follows
           WHERE following_id = (SELECT id FROM actors WHERE uri = $1)
             AND follower_id = (SELECT id FROM actors WHERE uri = $2)`,
          [follow.objectId.href, undo.actorId.href]
        );
      } catch (error) {
        console.error("Undo handler error:", error);
      }
    })    
    .on(Accept, async (ctx, accept) => {
      try {
        console.log("Accept activity received:", accept);
        const follow = await accept.getObject();
        if (!(follow instanceof Follow)) return;
    
        const following = await accept.getActor();
        if (!isActor(following)) return;
    
        const follower = follow.actorId;
        if (follower == null) return;
    
        const parsed = ctx.parseUri(follower);
        if (parsed == null || parsed.type !== "actor") return;
    
        // Persist the actor being followed
        const followingId = (await persistActor(following))?.id;
        if (followingId == null) return;
    
        // Insert the follow relationship into the database
        await pool.query(
          `
          INSERT INTO follows (following_id, follower_id)
          VALUES (
            $1,
            (
              SELECT actors.id
              FROM actors
              JOIN users ON actors.user_id = users.id
              WHERE users.username = $2
            )
          )
          `,
          [followingId, parsed.identifier] // Use parameterized queries to prevent SQL injection
        );
      } catch (error) {
        console.error("Error handling Accept activity:", (error as Error).message);
      }
    })
    .onError((ctx, error) => {
      console.error("Error in federation:", error);
    });
    
  federation
    .setFollowersDispatcher(
      "/users/{identifier}/followers",
      async (ctx, identifier, cursor) => {
        try {
          // Query the database to get followers for the user
          const followersResult = await pool.query(
            `
            SELECT followers.*
            FROM follows
            JOIN actors AS followers ON follows.follower_id = followers.id
            JOIN actors AS following ON follows.following_id = following.id
            JOIN users ON users.id = following.user_id
            WHERE users.username = $1
            ORDER BY follows.created DESC
            `,
            [identifier] // Use parameterized queries to prevent SQL injection
          );
  
          const followers = followersResult.rows;
  
          // Map the followers to Recipient objects
          const items: Recipient[] = followers.map((f) => ({
            id: new URL(f.uri),
            inboxId: new URL(f.inbox_url),
            endpoints:
              f.shared_inbox_url == null
                ? null
                : { sharedInbox: new URL(f.shared_inbox_url) },
          }));
  
          return { items };
        } catch (error) {
          if (error instanceof Error) {
            console.error("Error in setFollowersDispatcher:", error.message);
          } else {
            console.error("Unknown error in setFollowersDispatcher:", error);
          }
          return { items: [] }; // Return an empty list in case of an error
        }
      }
    )
    .setCounter(async (ctx, identifier) => {
      try {
        // Query the database to count the number of followers for the user
        const result = await pool.query(
          `
          SELECT count(*) AS cnt
          FROM follows
          JOIN actors ON actors.id = follows.following_id
          JOIN users ON users.id = actors.user_id
          WHERE users.username = $1
          `,
          [identifier] // Use parameterized queries to prevent SQL injection
        );
  
        return result.rows[0]?.cnt ?? 0; // Return the count or 0 if no result is found
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error in setCounter:", error.message);
        } else {
          console.error("Unknown error in setCounter:", error);
        }
        return 0; // Return 0 in case of an error
      }
    });
  
    federation.setObjectDispatcher(
      Note,
      "/users/{identifier}/posts/{id}",
      async (ctx, values) => {
        try {
          // Query the database to fetch the post
          const postResult = await pool.query(
            `
            SELECT posts.*
            FROM posts
            JOIN actors ON actors.id = posts.actor_id
            JOIN users ON users.id = actors.user_id
            WHERE users.username = $1 AND posts.id = $2
            `,
            [values.identifier, values.id] // Use parameterized queries to prevent SQL injection
          );
    
          const post = postResult.rows[0]; // Get the first row from the query result
    
          if (post == null) return null;
    
          // Convert the created field to ISO format if necessary
          const createdTimestamp =
            typeof post.created === "string"
              ? post.created.replace(" ", "T") + "Z"
              : post.created.toISOString(); // Handle Date objects
    
          // Create and return a new Note object based on the query result
          return new Note({
            id: ctx.getObjectUri(Note, values),
            attribution: ctx.getActorUri(values.identifier),
            to: PUBLIC_COLLECTION,
            cc: ctx.getFollowersUri(values.identifier),
            content: post.content,
            mediaType: "text/html",
            published: Temporal.Instant.from(createdTimestamp), // Use Temporal.Instant.from()
            url: ctx.getObjectUri(Note, values),
          });
        } catch (error) {
          if (error instanceof Error) {
            console.error("Error in setObjectDispatcher:", error.message);
          } else {
            console.error("Unknown error in setObjectDispatcher:", error);
          }
          return null; // Return null if there is an error
        }
      }
    );
    async function persistActor(actor: APActor): Promise<Actor | null> {
      if (actor.id == null || actor.inboxId == null) {
        console.log("[DEBUG] Actor missing ID or inbox:", actor);
        return null;
      }
    
      try {
        // Fetch public key
        let publicKey: string | null = null;
        try {
          const key = await actor.getPublicKey?.();
          publicKey = key instanceof CryptoKey 
            ? JSON.stringify(await exportJwk(key)) 
            : null;
          console.log("[DEBUG] Fetched public key for", actor.id.href);
        } catch (e) {
          console.error("[ERROR] Failed to fetch public key:", e);
        }
    
        // Insert/update actor
        const result = await pool.query(
          `INSERT INTO actors (
            uri, handle, name, inbox_url, 
            shared_inbox_url, url, public_key
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (uri) DO UPDATE SET 
             public_key = EXCLUDED.public_key
           RETURNING *`,
          [
            actor.id.href,
            await getActorHandle(actor),
            actor.name?.toString(),
            actor.inboxId.href,
            actor.endpoints?.sharedInbox?.href,
            actor.url?.href,
            publicKey // Can be NULL
          ]
        );
        
        console.log("[DEBUG] Persisted actor:", result.rows[0]?.uri);
        return result.rows[0] ?? null;
      } catch (error) {
        console.error("[ERROR] Database error:", error);
        return null;
      }
    }        
    
  export default federation;
  