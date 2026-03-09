import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../db/init/db_index";

export async function GET(req: NextRequest)
{
    const result = await pool.query(
        `
        SELECT id, asset_id, user_id, checkout_status, request_date, checkout_length, processed_by, returned_at
        FROM asset_checkout
        WHERE checkout_status = 'PENDING'
        `
    );
    return NextResponse.json(result.rows);
}

