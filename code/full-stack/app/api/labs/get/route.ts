import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../../db/init/db_index";

export async function GET(req: NextRequest)
{
    try{
         const result = await pool.query(
        `
        SELECT id, name, created_at
        FROM labs
        `
    );
    return NextResponse.json(result.rows);
    }
    catch(err)
    {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }
}