import { randomBytes, scryptSync } from "node:crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type RegisterRequestBody = {
  fullName?: string;
  email?: string;
  password?: string;
};

async function resolveNameColumn(): Promise<"name" | "full_name"> {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name IN ('name', 'full_name')`
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  if (columns.has("full_name")) {
    return "full_name";
  }

  return "name";
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequestBody;

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!fullName) {
      return NextResponse.json({ ok: false, message: "Full name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ ok: false, message: "Password is required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    const nameColumn = await resolveNameColumn();

    const result = await pool.query<{ id: string; user_name: string; email: string }>(
      `INSERT INTO users (${nameColumn}, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id::text AS id, ${nameColumn} AS user_name, email`,
      [fullName, email, passwordHash]
    );

    return NextResponse.json({
      ok: true,
      message: "User created successfully.",
      user: {
        id: result.rows[0]?.id,
        name: result.rows[0]?.user_name,
        email: result.rows[0]?.email,
      },
    });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };

    if (pgError.code === "23505") {
      return NextResponse.json({ ok: false, message: "Email already exists." }, { status: 409 });
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to create user.",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
