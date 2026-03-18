import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../../../db/init/db_index";
import {Asset} from "../../../../types";
import { broadcastEvent } from "../../../sse/route";

//Function for adding new assets to the DB
export async function POST(req: NextRequest) {
    try
    {
        const asset: Asset = await req.json();
        if (!asset.id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        await pool.query(
            `
            DELETE FROM assets WHERE id = $1
            `
            ,
            [asset.id]
        )
        broadcastEvent({ type: "REMOVE_ASSET", asset_id: asset.id });
        return NextResponse.json({ success: true }, { status: 200 });
    }
    catch(err)
    {
        const asset: Asset = await req.json();
        console.error(`Error deleting asset ${asset.name}`);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
