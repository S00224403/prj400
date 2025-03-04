import { serve } from "@hono/node-server";
import { behindProxy } from "x-forwarded-fetch";
import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
  Accept,
  Follow,
  Person,
  MemoryKvStore,
} from "@fedify/fedify";
import { openKv } from "@deno/kv";

const kv = await openKv("kv.db");

const federation = createFederation<void>({
  kv: new MemoryKvStore(),
});

federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    if (identifier !== "me") return null;
    return new Person({
      id: ctx.getActorUri(identifier),
      name: "Me",
      summary: "This is me!",
      preferredUsername: identifier,
      url: new URL("/", ctx.url),
      inbox: ctx.getInboxUri(identifier),
      publicKeys: (await ctx.getActorKeyPairs(identifier))
        .map(keyPair => keyPair.cryptographicKey),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    if (identifier != "me") return [];
    const entry = await kv.get<{
      privateKey: JsonWebKey;
      publicKey: JsonWebKey;
    }>(["key"]);
    if (entry == null || entry.value == null) {
      const { privateKey, publicKey } =
        await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
      await kv.set(
        ["key"],
        {
          privateKey: await exportJwk(privateKey),
          publicKey: await exportJwk(publicKey),
        }
      );
      return [{ privateKey, publicKey }];
    }
    const privateKey = await importJwk(entry.value.privateKey, "private");
    const publicKey = await importJwk(entry.value.publicKey, "public");
    return [{ privateKey, publicKey }];
  });

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.id == null || follow.actorId == null || follow.objectId == null) {
      return;
    }
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor" || parsed.identifier !== "me") return;
    const follower = await follow.getActor(ctx);
    if (follower == null) return;
    await ctx.sendActivity(
      { identifier: parsed.identifier },
      follower,
      new Accept({ actor: follow.objectId, object: follow }),
    );
    await kv.set(["followers", follow.id.href], follow.actorId.href);
  });

serve({
  port: 8000,
  fetch: behindProxy(async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      const followers: string[] = [];
      for await (const entry of kv.list<string>({ prefix: ["followers"] })) {
        if (followers.includes(entry.value)) continue;
        followers.push(entry.value);
      }
      return new Response(
        `<h1>EduFedi Server</h1><h2>Followers:</h2><ul>${followers.map((f) => `<li>${f}</li>`).join('')}</ul>`,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }
    return await federation.fetch(request, { contextData: undefined });
  }),
});

console.log("EduFedi server running on http://localhost:8000");
