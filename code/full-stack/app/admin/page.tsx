"use client";

import ActiveAssetsView from "./components/ActiveCheckout";
import AssetHistoryView from "./components/RequestHistory";
import RequestsView from "./components/Requests";
import {AssetCheckout, Asset} from "../types";
import { useEffect, useState, useCallback} from "react";
import EditAssetsView from "./components/EditAssets";
import EditAssetsPanel from "./components/EditAssetsPanel";

export default function AdminDashboard()
{
    const[requests, setRequests] = useState<AssetCheckout[]>([]);
    const[active, setActive] = useState<AssetCheckout[]>([]);
    const[inactive, setInactive] = useState<AssetCheckout[]>([]);
    const[assets, setAssets] = useState<Asset[]>([]);
    const [showCreatePanel, setShowCreatePanel] = useState(false);

    const handleCreateAsset = (newAsset: Asset) => {
        // send to backend
        fetch("/api/assets/edit/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAsset)
        }).then(res => res.json())
          .then(data => {
              setAssets([...assets, newAsset]);
          });
    };

    const fetchRequests = useCallback(async () => {
        const res = await fetch("/api/requests");
        setRequests(await res.json());
    }, []);

    const fetchActive = useCallback(async () => {
        const res = await fetch("/api/requests/active");
        setActive(await res.json());
    }, []);

    const fetchInactive = useCallback(async () => {
        const res = await fetch("/api/requests/inactive");
        setInactive(await res.json());
    }, []);

    const fetchAssets = useCallback(async () =>{
        const res = await fetch("/api/assets/get")
        setAssets(await res.json());
    }, []);

    useEffect(() => {
        fetchRequests();
        fetchActive();
        fetchInactive();
        fetchAssets();
    }, [fetchRequests, fetchActive, fetchInactive, fetchAssets]);

    useEffect(() => {
        const evtSource = new EventSource("/api/sse");
        evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Update selectively depending on event type
        if (data.type === "APPROVE") {
            fetchRequests();
            fetchActive();
        }
        if (data.type === "DENIED")
        {
            fetchRequests();
            fetchInactive();
        }
        if (data.type === "RETURNED")
        {
            fetchActive();
            fetchInactive();
        }
        if(data.type === "REMOVE_ASSET")
        {
            fetchAssets();
        }
        if(data.type === "ADD_ASSET")
        {
            fetchAssets();
        }
    };
    return () => evtSource.close();
  }, [fetchRequests, fetchActive, fetchInactive, fetchAssets]);

    return(
       <header className="">
            <div className="mx-auto px-8 py-4">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <a>Manage assets and handle asset requests</a>
            </div>
            <RequestsView data={requests}/>
            <ActiveAssetsView data={active}/>
            <AssetHistoryView data={inactive}/>
            <EditAssetsView data={assets} />
            
            <button className="cursor-pointer" onClick={() => setShowCreatePanel(true)}>Create New Asset</button>
            {showCreatePanel && (
                <EditAssetsPanel
                    onClose={() => setShowCreatePanel(false)}
                    onCreate={handleCreateAsset}
                />
            )}
        </header>
    );
}