"use client"
import {act, useEffect, useState} from "react"
import {Asset, AssetCheckout} from "../../types";
import { refresh } from "next/cache";
import { NEXT_HMR_REFRESH_HASH_COOKIE } from "next/dist/client/components/app-router-headers";

type Props = {
    data: AssetCheckout[];
}

//View for active checkouts
export default function ActiveAssetsView({data}: Props)
{

    async function ApproveReturn(requestId: string)
    {
         try{
            const res = await fetch("/api/requests/return", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: requestId}),
            });
            if (!res.ok) throw new Error("Failed to approve return");
        }
        catch(err)
        {
            console.error(err);
        }
    }

    //Display active assets
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
            <h2 className="text-1xl font-bold mb-4">
                Active Requests ({data.length})
            </h2>
            {data.length === 0 && (
                <p className="text-gray-500 text-center">No pending requests.</p>
            )}
            {data.length !== 0 &&(
                <>
                    <div className="grid grid-cols-5 gap-4 font-semibold text-gray-700 border-b pb-2 mb-2">
                        <div>USER</div>
                        <div>ASSET</div>
                        <div>CHECKED OUT</div>
                        <div>STATUS</div>
                        <div>ACTIONS</div>
                    </div>
                    <div className="space-y-2">
                        {data.map((active) => (
                            <div key={active.id} className="grid grid-cols-5 gap-4 items-center p-3 rounded-md bg-blue-50 border border-blue-200">
                                <div>{active.user_id}</div>
                                <div>{active.asset_id}</div>
                                <div>{new Date(active.request_date).toLocaleDateString()}</div>
                                <div>{active.checkout_status}</div>
                                <div>
                                    <button className="border border-gray-400 text-black px-2 py-1 rounded mr-2 cursor-pointer" onClick={()=> ApproveReturn(active.id)}>
                                        Mark Returned
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}