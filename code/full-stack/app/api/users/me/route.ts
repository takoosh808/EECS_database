import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

async function resolveNameColumn(): Promise<"name" | "full_name"> {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name IN ('name', 'full_name')`,
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  return columns.has("full_name") ? "full_name" : "name";
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("auth_user")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const nameColumn = await resolveNameColumn();
    const result = await pool.query<{
      id: string;
      user_name: string;
      email: string;
      role: "user" | "admin" | "owner";
    }>(
      `SELECT user_id::text AS id, ${nameColumn} AS user_name, email, role FROM users WHERE user_id::text = $1 LIMIT 1`,
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.user_name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}
