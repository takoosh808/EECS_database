import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    const result = await pool.query(
      `
      INSERT INTO categories (name)
      VALUES ($1)
      RETURNING *
      `,
      [name],
    );

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err) {
    console.error("Error adding new category", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
