"use client"
import {useEffect, useState} from "react"
import {Asset} from "../../types";

//View for asset history
export default function AssetHistoryView()
{
    //Call a GET API route for active assets
    const [inactive, setInactive] = useState<Asset[]>([]);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        async function loadInactiveAssets()
        {
            try{
                const res = await fetch("/api/requests/inactive");
                if(!res.ok) throw new Error("Failed to fetch inactive assets");
                const data: Asset[] = await res.json();
                setInactive(data);
            }
            catch(err)
            {
                console.error(err);
                setError("Failed to load inactive assets");
            }
        }
        loadInactiveAssets();
    }, []);


    //Display active assets
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
            <h2 className="text-1xl font-bold mb-4">
                Inactive Requests ({inactive.length})
            </h2>
            {inactive.length === 0 && (
                <p className="text-gray-500 text-center">No inactive requests.</p>
            )}
            {inactive.length !== 0 &&(
                <>
                    <div className="grid grid-cols-4 gap-4 font-semibold text-gray-700 border-b pb-2 mb-2">
                        <div>USER</div>
                        <div>ASSET</div>
                        <div>REQUESTED</div>
                        <div>STATUS</div>
                    </div>
                    <div className="space-y-4">
                        {inactive.map((inactive) => (
                            <div key={inactive.id} className="grid grid-cols-4 gap-4 items-center p-3 rounded-md bg-blue-50 border border-blue-200">
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