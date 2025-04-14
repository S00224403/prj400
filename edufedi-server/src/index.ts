import { serve } from "@hono/node-server";
import app from "./app.tsx";
import { cors } from "hono/cors";

app.use(
  "/*",
  cors({
    origin: "*", // Allow requests only from your React app
    allowMethods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow cookies and credentials if needed
  })
)
serve(
  { port: 8080, fetch: app.fetch },
  () => console.log("API server running at http://localhost:8080")
);
