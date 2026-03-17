import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../../db/init/db_index";
import { broadcastEvent } from "../sse/route";

//POST API route for approving requests, very similar to approve but we use DENIED flag
export async function POST(req: NextRequest)
{
    try
    {
        const{id} = await req.json();
        if (!id) return NextResponse.json({error: "No ID provided"}, {status: 400});
        const reqRow = await pool.query(
            `
            SELECT checkout_status FROM asset_checkout WHERE id = $1
            `,[id]
        )
        if (reqRow.rowCount === 0)
        {
            return NextResponse.json({error: "Request not found"}, {status: 400});
        }
        if(reqRow.rows[0].checkout_status !== "PENDING")
        {
            return NextResponse.json({ error: "Request already processed" }, { status: 400 });
        }
        console.log("SQL query:", `
        UPDATE asset_checkout
        SET checkout_status = $1
        WHERE id = $2
        `);
        console.log("Params:", ["DENIED", id]);
        await pool.query(
            `
            UPDATE asset_checkout
            SET checkout_status = $1
            WHERE id = $2
            `,["DENIED", id]
        );
        broadcastEvent({ type: "DENIED", requestId: id });
        return NextResponse.json({success: true});
    }
    catch(err)
    {
        console.error(err);
        return NextResponse.json({error: "Failed to deny request"}, {status: 500});
    }
}