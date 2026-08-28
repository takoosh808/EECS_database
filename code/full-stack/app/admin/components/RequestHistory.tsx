"use client"
import {useEffect, useState} from "react"
import {Asset, AssetCheckout} from "../../types";

type Props = {
    data: AssetCheckout[];
}


//View for asset history
export default function AssetHistoryView({data}: Props)
{
   
    //Display active assets
    return (
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 max-w-6xl mx-auto">
            <h2 className="text-1xl font-bold mb-4">
                Inactive Requests ({data.length})
            </h2>
            {data.length === 0 && (
                <p className="text-zinc-500 text-center">No inactive requests.</p>
            )}
            {data.length !== 0 &&(
                <>
                    <div className="grid grid-cols-4 gap-4 font-semibold text-zinc-600 border-b border-zinc-200 pb-2 mb-2">
                        <div>USER</div>
                        <div>ASSET</div>
                        <div>REQUESTED</div>
                        <div>STATUS</div>
                    </div>
                    <div className="space-y-4">
                        {data.map((inactive) => (
                            <div key={inactive.id} className="grid grid-cols-4 gap-4 items-center p-3 rounded-md bg-crimson-50 border border-crimson-100">
                                <div>{inactive.user_id}</div>
                                <div>{inactive.asset_id}</div>
                                <div>{new Date(inactive.request_date).toLocaleDateString()}</div>
                                <div>{inactive.checkout_status}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}