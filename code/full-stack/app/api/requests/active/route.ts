import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../../db/init/db_index";

export async function GET(req: NextRequest)
{
    try{
         const result = await pool.query(
        `
        SELECT ac.id,
               ac.asset_id,
               ac.user_id,
               ac.checkout_status,
               ac.request_date,
               ac.checkout_length,
               ac.processed_by,
               ac.returned_at,
               msg.message_text AS request_details
        FROM asset_checkout ac
        LEFT JOIN LATERAL (
          SELECT message_text
          FROM asset_checkout_messages
          WHERE checkout_id = ac.id
            AND message_type = 'REASON'
          ORDER BY created_at DESC
          LIMIT 1
        ) AS msg ON true
        WHERE ac.checkout_status = 'ACTIVE'
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