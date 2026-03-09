"use client"
import {useEffect, useState} from "react"
import {AssetRequest} from "../../types";
import { delayUntilRuntimeStage } from "next/dist/server/app-render/dynamic-rendering";


//Important: We need to implmenet server sockets for real time updating. since its possible multiple admins will be using this webapp we'll need real time updating.
//Pooling is also an option but sockets is more industry standard.

//View for requested assets
export default function RequestsView()
{
    //call a GET API route for asset requests
    const [requests, setRequests] = useState<AssetRequest[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    //we need to add server socket to apply real time server updates for new requests
    useEffect(() => {
        async function loadRequests()
        {
            try{
                const res = await fetch("/api/requests");
                if(!res.ok) throw new Error("Failed to fetch requests");
                const data: AssetRequest[] = await res.json();
                setRequests(data);
            }
            catch(err)
            {
                console.error(err);
                setError("Failed to load requests");
            }
        }
        loadRequests();
    }, []);
    
    //Function for approving requests which calls aprove API route
    async function approveRequests(requestId: string)
    {
        try{
            const res = await fetch("/api/requests/approve", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: requestId}),
            });
            if (!res.ok) throw new Error("Failed to approve request");

            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        }
        catch(err)
        {
            console.error(err);
        }
    }
    async function denyRequest(requestId: string)
    {
         try{
            const res = await fetch("../../api/requests/deny", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: requestId}),
            });
            if (!res.ok) throw new Error("Failed to deny request");

            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        }
        catch(err)
        {
            console.error(err);
        }
    }
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
            <h2 className="text-1xl font-bold mb-4">
                Pending Requests ({requests.length})
            </h2>
            {requests.length === 0 && (
                <p className="text-gray-500 text-center">No pending requests.</p>
            )}
            {requests.length !== 0 &&(
                <>
                    {/* Table header */}
                    <div className="grid grid-cols-5 gap-4 font-semibold text-gray-700 border-b pb-2 mb-2">
                        <div>USER</div>
                        <div>ASSET</div>
                        <div>REQUEST DATE</div>
                        <div>STATUS</div>
                        <div>ACTIONS</div>
                    </div>
                    {/* Table rows */}
                    <div className="space-y-2">
                        {requests.map((req) => (
                            <div key={req.id} className="grid grid-cols-5 gap-4 items-center p-3 rounded-md bg-blue-50 border border-blue-200">
                                <div>{req.user_id}</div>
                                <div>{req.asset_id}</div>
                                <div>{new Date(req.request_date).toLocaleDateString()}</div>
                                <div>{req.checkout_status}</div>
                                <div>
                                    <button className="bg-green-500 text-white px-2 py-1 rounded mr-2 cursor-pointer" onClick={()=> approveRequests(req.id)}>
                                        Approve
                                    </button>
                                    <button className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer" onClick={()=> denyRequest(req.id)}>
                                        Deny
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