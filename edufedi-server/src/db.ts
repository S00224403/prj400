import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
});

// Test the database connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to the database successfully!");
    client.release(); // Release the client back to the pool
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client:", err.message);
    });    
  } catch (err) {
    console.error("Error connecting to the database:", (err as Error).message);
    process.exit(1); // Exit the process if connection fails
  }
})();

export default pool;