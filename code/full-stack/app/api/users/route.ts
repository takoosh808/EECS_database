import { randomBytes, scryptSync } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../db/init/db_index";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  name: string;
  email: string;
  type: "user" | "admin" | "owner";
};

type CreateUserBody = {
  name?: string;
  email?: string;
  role?: "user" | "admin" | "owner";
};

async function getRole(req: NextRequest): Promise<"user" | "admin" | "owner" | null> {
  const userId = req.cookies.get("auth_user")?.value;
  if (!userId) {
    return null;
  }

  const result = await pool.query<{ role: "user" | "admin" | "owner" }>("SELECT role FROM users WHERE id::text = $1 LIMIT 1", [userId]);
  return result.rows[0]?.role ?? null;
}

function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(12);
  randomBytes(values.length * 4).copy(Buffer.from(values.buffer));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function GET(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const result = await pool.query<UserRow>(
      `SELECT id::text AS id, name, email, role AS type
       FROM users
       ORDER BY name ASC, email ASC`
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if ((await getRole(req)) !== "owner") {
      return NextResponse.json({ error: "Unauthorized: Owner access required" }, { status: 403 });
    }

    const body = (await req.json()) as CreateUserBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role ?? "user";

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (role !== "user" && role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text AS id, name, email, role AS type`,
      [name, email, role, hashPassword(temporaryPassword)]
    );

    return NextResponse.json({ user: result.rows[0], temporaryPassword }, { status: 201 });
  } catch (err: unknown) {
    console.error(err);
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
