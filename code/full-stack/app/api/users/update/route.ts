import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

async function resolveNameColumn(): Promise<"name" | "full_name"> {
  const result = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name IN ('name', 'full_name')`
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  return columns.has("full_name") ? "full_name" : "name";
}

type UpdateProfileBody = {
  name?: string;
  email?: string;
};

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("auth_user")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as UpdateProfileBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const nameColumn = await resolveNameColumn();
    const result = await pool.query<{ id: string; user_name: string; email: string }>(
      `UPDATE users
       SET ${nameColumn} = $1, email = $2, updated_at = NOW()
       WHERE id::text = $3
       RETURNING id::text AS id, ${nameColumn} AS user_name, email`,
      [name, email, userId]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, name: user.user_name, email: user.email });
  } catch (err: unknown) {
    console.error(err);
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
