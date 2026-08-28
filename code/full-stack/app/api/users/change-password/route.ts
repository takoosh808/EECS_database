import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

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

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("auth_user")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ChangePasswordBody;
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    const result = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id::text = $1 LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id::text = $2`, [
      hashPassword(newPassword),
      userId,
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
