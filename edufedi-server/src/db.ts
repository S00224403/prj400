import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "edufedi",
  password: process.env.PASSWORD,
  port: 5432,
});

// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
    process.exit(1); // Exit the process if connection fails
  } else {
    console.log("Connected to the database successfully!");
    release(); // Release the client back to the pool
  }
});

export default pool;
