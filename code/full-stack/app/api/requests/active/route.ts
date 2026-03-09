import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../../db/init/db_index";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";

export async function GET(req: NextRequest)
{
    try{
         const result = await pool.query(
        `
        SELECT id, asset_id, user_id, checkout_status, request_date, checkout_length, processed_by, returned_at
        FROM asset_checkout
        WHERE checkout_status = 'ACTIVE'
        `
    );
    return NextResponse.json(result.rows);
    }
    catch(err)
    {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch active assets" }, { status: 500 });
    }
}