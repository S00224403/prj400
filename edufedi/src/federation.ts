import {
  Accept,
  Endpoints,
  Follow,
  Person,
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  getActorHandle,
  importJwk,
} from "@fedify/fedify";
import type { Actor, Key, User } from "./schema.ts";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import pool from "./db.ts"; // PostgreSQL connection pool
const logger = getLogger("edufedi");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  try {
    // Query the database for user and actor information
    const result = await pool.query(
      `
      SELECT *
      FROM users
      JOIN actors ON (users.id = actors.user_id)
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
    // Query the database for user information
    const userResult = await pool.query(
      `
      SELECT * FROM users WHERE username = $1
      `,
      [identifier]
    );
    const user = userResult.rows[0];
    if (user == null) return []; // Return an empty array if no user is found

    // Query the database for keys associated with the user
    const keysResult = await pool.query(
      `
      SELECT * FROM keys WHERE keys.user_id = $1
      `,
      [user.id]
    );
    const rows = keysResult.rows;

    const keys = Object.fromEntries(
      rows.map((row) => [row.type, row])
    ) as Record<Key["type"], Key>;

    const pairs: CryptoKeyPair[] = [];

    // For each key type, check if a key pair exists; if not, generate and store it
    for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
      if (!keys[keyType]) {
        logger.debug(
          "The user {identifier} does not have an {keyType} key; creating one...",
          { identifier, keyType }
        );

        const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);

        // Insert the generated key pair into the database
        await pool.query(
          `
          INSERT INTO keys (user_id, type, private_key, public_key)
          VALUES ($1, $2, $3, $4)
          `,
          [
            user.id,
            keyType,
            JSON.stringify(await exportJwk(privateKey)),
            JSON.stringify(await exportJwk(publicKey)),
          ]
        );

        pairs.push({ privateKey, publicKey });
      } else {
        pairs.push({
          privateKey: await importJwk(
            JSON.parse(keys[keyType].private_key),
            "private"
          ),
          publicKey: await importJwk(
            JSON.parse(keys[keyType].public_key),
            "public"
          ),
        });
      }
    }

    return pairs;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in setKeyPairsDispatcher:", error.message);
    } else {
      console.error("Unknown error in setKeyPairsDispatcher:", error);
    }
    return []; // Return an empty array if there is an error
  }
});

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    try {
      if (follow.objectId == null) {
        logger.debug("The Follow object does not have an object: {follow}", {
          follow,
        });
        return;
      }

      const object = ctx.parseUri(follow.objectId);
      if (object == null || object.type !== "actor") {
        logger.debug("The Follow object's object is not an actor: {follow}", {
          follow,
        });
        return;
      }

      const follower = await follow.getActor();
      if (follower?.id == null || follower.inboxId == null) {
        logger.debug("The Follow object does not have an actor: {follow}", {
          follow,
        });
        return;
      }

      // Query the database to find the actor to follow
      const followingResult = await pool.query(
        `
        SELECT actors.id
        FROM actors
        JOIN users ON users.id = actors.user_id
        WHERE users.username = $1
        `,
        [object.identifier]
      );
      const followingId = followingResult.rows[0]?.id;

      if (followingId == null) {
        logger.debug(
          "Failed to find the actor to follow in the database: {object}",
          { object }
        );
        return;
      }

      // Add a new follower actor record or update if it already exists
      const followerResult = await pool.query(
        `
        INSERT INTO actors (uri, handle, name, inbox_url, shared_inbox_url, url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (uri) DO UPDATE SET
          handle = excluded.handle,
          name = excluded.name,
          inbox_url = excluded.inbox_url,
          shared_inbox_url = excluded.shared_inbox_url,
          url = excluded.url
        RETURNING id
        `,
        [
          follower.id.href,
          await getActorHandle(follower),
          follower.name?.toString(),
          follower.inboxId.href,
          follower.endpoints?.sharedInbox?.href,
          follower.url?.href,
        ]
      );
      const followerId = followerResult.rows[0]?.id;

      // Insert the follow relationship into the database
      await pool.query(
        `
        INSERT INTO follows (following_id, follower_id)
        VALUES ($1, $2)
        `,
        [followingId, followerId]
      );

      // Create and send an Accept activity
      const accept = new Accept({
        actor: follow.objectId,
        to: follow.actorId,
        object: follow,
      });
      await ctx.sendActivity(object, follower, accept);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error handling Follow activity:", { message: error.message });
      } else {
        console.error("Unknown error handling Follow activity:", error);
      }
    }
  });
export default federation;
