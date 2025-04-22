import { serve } from "@hono/node-server";
import app from "./app.tsx";
import { cors } from "hono/cors";
import { behindProxy } from "x-forwarded-fetch";
const allowedOrigins = [
  "http://localhost:3000",
  "https://edufedi-frontend.onrender.com",
  "https://www.edufedi.com",
];

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
  await next();
});

serve(
  {
    port: 8080,
    fetch: behindProxy(app.fetch.bind(app)),
  },
  (info) =>
    console.log("Server started at https://" + info.address + ":" + info.port)
);