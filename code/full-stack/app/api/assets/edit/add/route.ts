import { NextRequest, NextResponse } from "next/server";
import  pool  from "../../../../../db/init/db_index";
import {Asset} from "../../../../types";
import { broadcastEvent } from "@/app/api/sse/route";

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
            INSERT INTO assets (id, name, category_id, lab_id, serial_number)
            VALUES ($1, $2, $3, $4, $5)
            `
            ,
            [asset.id, asset.name, asset.category_id, asset.lab_id, asset.serial_number]
        )
        broadcastEvent({ type: "ADD_ASSET", asset_id: asset.id });
        return NextResponse.json({ success: true }, { status: 200 });
    }
    catch(err)
    {
        console.error("Error adding new asset to database", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
