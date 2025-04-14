import { serve } from "@hono/node-server";
import app from "./app.tsx";
import { cors } from "hono/cors";
const allowedOrigins = [
  "http://localhost:3000",
  "https://edufedi-frontend.onrender.com",
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
  { port: 8080, fetch: app.fetch },
  () => console.log("API server running")
);
