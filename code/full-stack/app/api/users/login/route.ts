import { scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import pool from "@/db/init/db_index";

export const runtime = "nodejs";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

async function resolveNameColumn(): Promise<"name" | "full_name"> {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name IN ('name', 'full_name')`,
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  if (columns.has("full_name")) {
    return "full_name";
  }

  return "name";
}

function verifyPassword(password: string, encodedHash: string): boolean {
  const parts = encodedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const salt = Buffer.from(parts[1], "hex");
  const storedHex = parts[2];
  const calculated = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHex, "hex");

  if (stored.length !== calculated.length) {
    return false;
  }

  return timingSafeEqual(stored, calculated);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Email is required." },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, message: "Password is required." },
        { status: 400 },
      );
    }

    const nameColumn = await resolveNameColumn();

    const result = await pool.query<{
      user_id: string;
      user_name: string;
      email: string;
      role: "user" | "admin";
      password_hash: string;
    }>(
      `SELECT user_id::text AS id, ${nameColumn} AS user_name, email, role, password_hash
       FROM users
       WHERE lower(email) = $1
       LIMIT 1`,
      [email],
    );

    const user = result.rows[0];
    if (
      !user ||
      !user.password_hash ||
      !verifyPassword(password, user.password_hash)
    ) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      message: "Login successful.",
      user: {
        user_id: user.user_id,
        name: user.user_name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("auth_user", user.user_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Login failed.",
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
