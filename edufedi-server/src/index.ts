import { serve } from "@hono/node-server";
import app from "./app.tsx";

serve(
  { port: 8080, fetch: app.fetch },
  () => console.log("API server running at http://localhost:8080")
);
