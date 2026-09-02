import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
);
