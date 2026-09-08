import { randomBytes, scryptSync } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

export const runtime = "nodejs";

type UpdateUserBody = {
  name?: string;
  email?: string;
  role?: "user" | "admin" | "owner";
  password?: string;
};

async function isOwner(req: NextRequest): Promise<boolean> {
  const userId = req.cookies.get("auth_user")?.value;
  if (!userId) return false;
  const result = await pool.query<{ role: string }>(
    "SELECT role FROM users WHERE user_id::text = $1 LIMIT 1",
    [userId],
  );
  return result.rows[0]?.role === "owner";
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString(
    "hex",
  );
  return `scrypt$${salt}$${hash}`;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isOwner(req))) {
      return NextResponse.json(
        { error: "Unauthorized: Owner access required" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await req.json()) as UpdateUserBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;

    if (
      !name ||
      !email ||
      !role ||
      !["user", "admin", "owner"].includes(role)
    ) {
      return NextResponse.json(
        { error: "Name, email, and a valid role are required" },
        { status: 400 },
      );
    }
    if (body.password !== undefined && body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           role = $3,
           password_hash = CASE WHEN $4::text IS NULL THEN password_hash ELSE $5 END,
           updated_at = NOW()
       WHERE id::text = $6
       RETURNING id::text AS id, name, email, role AS type`,
      [
        name,
        email,
        role,
        body.password ?? null,
        body.password ? hashPassword(body.password) : null,
        id,
      ],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    console.error(err);
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isOwner(req))) {
      return NextResponse.json(
        { error: "Unauthorized: Owner access required" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const result = await pool.query("DELETE FROM users WHERE id::text = $1", [
      id,
    ]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 },
    );
  }
}
