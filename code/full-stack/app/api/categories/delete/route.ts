import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    await pool.query(
      `
      DELETE FROM categories
      WHERE name = $1
      `,
      [name],
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error deleting category", err);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
