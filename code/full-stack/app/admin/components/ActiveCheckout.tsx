"use client"
import {act, useEffect, useState} from "react"
import {Asset} from "../../types";

//View for active checkouts
export default function ActiveAssetsView()
{
    //Call a GET API route for active assets
    const [active, setActive] = useState<Asset[]>([]);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        async function loadActiveRequests()
        {
            try{
                const res = await fetch("/api/requests/active");
                if(!res.ok) throw new Error("Failed to fetch active assets");
                const data: Asset[] = await res.json();
                setActive(data);
            }
            catch(err)
            {
                console.error(err);
                setError("Failed to load active assets");
            }
        }
        loadActiveRequests();
    }, []);


    async function ApproveReturn(requestId: string)
    {
         try{
            const res = await fetch("/api/requests/return", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: requestId}),
            });
            if (!res.ok) throw new Error("Failed to approve return");

            setActive((prev) => prev.filter((r) => r.id !== requestId));
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
                Active Requests ({active.length})
            </h2>
            {active.length === 0 && (
                <p className="text-gray-500 text-center">No pending requests.</p>
            )}
            {active.length !== 0 &&(
                <>
                    <div className="grid grid-cols-5 gap-4 font-semibold text-gray-700 border-b pb-2 mb-2">
                        <div>USER</div>
                        <div>ASSET</div>
                        <div>CHECKED OUT</div>
                        <div>STATUS</div>
                        <div>ACTIONS</div>
                    </div>
                    <div className="space-y-2">
                        {active.map((active) => (
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