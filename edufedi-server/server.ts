import express from 'express';
import { 
  createFederation, 
  MemoryKvStore, 
  Person, 
  Follow, 
  Accept,
  generateCryptoKeyPair,
  exportJwk,
  importJwk
} from "@fedify/fedify";

import { openKv } from "@deno/kv";

const app = express();
const port = 8000;
const BASE_URL = "https://8253-93-107-99-204.ngrok-free.app";
const domain = new URL(BASE_URL).hostname;

const kv = await openKv("kv.db");

const federation = createFederation<void>({
  kv: new MemoryKvStore(),
});

federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    if (identifier !== "edufedi") return null;
    return new Person({
      id: ctx.getActorUri(identifier),
      name: "EduFedi",
      summary: "EduFedi server for academic communication",
      preferredUsername: identifier,
      url: new URL("/", ctx.url),
      inbox: ctx.getInboxUri(identifier),
      outbox: ctx.getOutboxUri(identifier),
      publicKeys: (await ctx.getActorKeyPairs(identifier))
        .map(keyPair => keyPair.cryptographicKey),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    if (identifier !== "edufedi") return [];
    
    const entry = await kv.get(["keypair"]);
    if (entry == null || entry.value == null) {
      const { privateKey, publicKey } = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
      const privateJwk = await exportJwk(privateKey);
      const publicJwk = await exportJwk(publicKey);
      
      await kv.set(["keypair"], { privateJwk, publicJwk });
      
      return [{ privateKey, publicKey }];
    }
    
    const privateKey = await importJwk(entry.value.privateJwk, "private");
    const publicKey = await importJwk(entry.value.publicJwk, "public");
    
    return [{ privateKey, publicKey }];
  });

federation.setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.id == null || follow.actorId == null || follow.objectId == null) {
      return;
    }
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor" || parsed.identifier !== "edufedi") return;
    const follower = await follow.getActor(ctx);
    if (follower == null) return;

    await ctx.sendActivity(
      { identifier: parsed.identifier },
      follower,
      new Accept({ actor: follow.objectId, object: follow }),
    );

    await kv.set(["followers", follow.id.href], follow.actorId.href);
  })
  .on("Create", async (ctx, create) => {
    if (create.object?.type === "Note") {
      await kv.set(["posts", create.id], JSON.stringify(create.object));
    }
  });

  app.get('/', (req, res) => {
    res.send(`
      <h1>EduFedi server is running</h1>
      <p>
        <a href="/mastodon-feed">Fetch latest posts from Mastodon Ireland</a>
      </p>
      <p>
        <a href="/feed">View current feed</a>
      </p>
    `);
  });  

app.get('/.well-known/webfinger', (req, res) => {
  const resource = req.query.resource;
  if (resource === `acct:edufedi@${domain}`) {
    res.json({
      subject: resource,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: `${BASE_URL}/users/edufedi`
        }
      ]
    });
  } else {
    res.status(404).send('Not Found');
  }
});

app.get('/users/:username', (req, res) => {
  const { username } = req.params;
  if (username !== 'edufedi') {
    return res.status(404).send('Not Found');
  }
  res.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Person',
    id: `${BASE_URL}/users/${username}`,
    name: 'EduFedi',
    preferredUsername: username,
    summary: "EduFedi server for academic communication",
    inbox: `${BASE_URL}/users/${username}/inbox`,
    outbox: `${BASE_URL}/users/${username}/outbox`,
    url: BASE_URL,
  });
});
app.get('/mastodon-feed', async (req, res) => {
  try {
    // Fetch public timeline from Mastodon Ireland
    const response = await fetch('https://mastodon.ie/api/v1/timelines/public?local=true', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch public timeline: ${response.status}`);
    }
    
    const posts = await response.json();
    
    // Store posts in your local database
    for (const post of posts) {
      await kv.set(["posts", post.id], JSON.stringify({
        id: post.id,
        type: "Note",
        content: post.content,
        published: post.created_at,
        attributedTo: post.account.url,
        url: post.url
      }));
    }
    
    res.redirect('/feed');
  } catch (error) {
    console.error('Mastodon feed error:', error);
    res.status(500).send(`Error fetching Mastodon feed: ${error.message}`);
  }
});

//
// Needs work current erro 401 request not signed
//
// app.post('/follow', express.json(), async (req, res) => {
//   const { actorToFollow } = req.body;
//   console.log(actorToFollow);

//   try {
//     // Convert web URL to ActivityPub actor URL if needed
//     let actorUrl = actorToFollow;
//     if (actorUrl.includes('@')) {
//       // This is a web URL like https://mastodon.ie/@username
//       // Extract the username
//       const username = actorUrl.split('@')[1];
//       // Construct the proper ActivityPub URL
//       actorUrl = `https://mastodon.ie/users/${username}`;
//     }
    
//     // Fetch the actor with proper Accept header
//     const response = await fetch(actorUrl, {
//       headers: {
//         'Accept': 'application/activity+json, application/ld+json'
//       }
//     });    
    
//     if (!response.ok) {
//       const text = await response.text();
//       console.error(`Error response: ${text}`);
//       throw new Error(`Failed to fetch actor: ${response.status}`);
//     }    
    
//     const actor = await response.json();
//     const inboxUrl = actor.inbox;
    
//     if (!inboxUrl) {
//       throw new Error('Actor does not have an inbox');
//     }
    
//     const followActivity = {
//       "@context": "https://www.w3.org/ns/activitystreams",
//       "type": "Follow",
//       "actor": `${BASE_URL}/users/edufedi`,
//       "object": actorUrl
//     };
    
//     await federation.sendActivity(
//       { identifier: "edufedi" },
//       followActivity,
//       new URL(inboxUrl),
//       { preferSharedInbox: false }
//     );
    
//     res.status(200).send('Follow request sent');
//   } catch (error) {
//     console.error('Follow error:', error);
//     res.status(500).send(`Error sending follow request: ${error.message}`);
//   }
// });

app.get('/feed', async (req, res) => {
  try {
    const posts = [];
    for await (const entry of kv.list({ prefix: ["posts"] })) {
      posts.push(JSON.parse(entry.value));
    }
    
    if (posts.length === 0) {
      return res.send(`
        <h1>No posts yet</h1>
        <p><a href="/mastodon-feed">Fetch posts from Mastodon Ireland</a></p>
      `);
    }
    
    const html = `
      <h1>Feed</h1>
      <p><a href="/mastodon-feed">Refresh feed from Mastodon Ireland</a></p>
      <div class="posts">
        ${posts.map(post => `
          <div class="post">
            <div class="content">${post.content}</div>
            <div class="meta">
              <span class="date">${new Date(post.published).toLocaleString()}</span>
              ${post.attributedTo ? `<span class="author">by ${post.attributedTo}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).send('Error fetching feed');
  }
});

app.use(express.json());

app.use(async (req, res, next) => {
  try {
    const url = new URL(req.url, BASE_URL);
    const adaptedReq = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.body
    });
    const result = await federation.fetch(adaptedReq, { contextData: undefined });
    if (result) {
      res.status(result.status).send(await result.text());
    } else {
      next();
    }
  } catch (error) {
    console.error('Federation error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`EduFedi server running on ${BASE_URL}`);
});
