import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

//for docker
const config: DBConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT) || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DB || "postgres",
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "",
};

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool(config);

//for local db and using npm run dev
// const config: DBConfig = {
//   host: process.env.DB_HOST || "localhost",
//   port: Number(process.env.DB_PORT) || 5432,
//   database: process.env.DB_NAME || "postgres",
//   user: process.env.DB_USER || "postgres",
//   password: process.env.DB_PASSWORD || "",
// };

// const pool = new Pool(config);

export default pool;
