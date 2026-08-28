"use client";

import ActiveAssetsView from "./components/ActiveCheckout";
import AssetHistoryView from "./components/RequestHistory";
import RequestsView from "./components/Requests";
import {AssetCheckout, Asset} from "../types";
import { useEffect, useState, useCallback} from "react";
import EditAssetsView from "./components/ManageAssets";
import CreateAssetsPanel from "./components/CreateAssetsPanel";
import { useRouter } from "next/navigation";

export default function AdminDashboard()
{
    const router = useRouter();
    const[requests, setRequests] = useState<AssetCheckout[]>([]);
    const[active, setActive] = useState<AssetCheckout[]>([]);
    const[inactive, setInactive] = useState<AssetCheckout[]>([]);
    const[assets, setAssets] = useState<Asset[]>([]);
    const [showCreatePanel, setShowCreatePanel] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const userRole = localStorage.getItem("userRole");
        if (userRole !== "admin" && userRole !== "owner") {
            router.push("/home");
            return;
        }
        setIsAuthorized(true);
        setIsChecking(false);
    }, [router]);

    const handleCreateAsset = (newAsset: Asset) => {
        // send to backend
        //we need to do checks here whenever a new asset is created.

        //first we need to check the fields that are referenced 



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
        try {
            const res = await fetch("/api/requests");
            if (!res.ok) {
                setRequests([]);
                return;
            }
            const json = await res.json();
            setRequests(Array.isArray(json) ? json : []);
        }
        catch (err)
        {
            console.error(err);
            setRequests([]);
        }
    }, []);

    const fetchActive = useCallback(async () => {
        try {
            const res = await fetch("/api/requests/active");
            if (!res.ok) {
                setActive([]);
                return;
            }
            const json = await res.json();
            setActive(Array.isArray(json) ? json : []);
        }
        catch (err)
        {
            console.error(err);
            setActive([]);
        }
    }, []);

    const fetchInactive = useCallback(async () => {
        try {
            const res = await fetch("/api/requests/inactive");
            if (!res.ok) {
                setInactive([]);
                return;
            }
            const json = await res.json();
            setInactive(Array.isArray(json) ? json : []);
        }
        catch (err)
        {
            console.error(err);
            setInactive([]);
        }
    }, []);

    const fetchAssets = useCallback(async () =>{
        try {
            const res = await fetch("/api/assets/get")
            if (!res.ok) {
                setAssets([]);
                return;
            }
            const json = await res.json();
            setAssets(Array.isArray(json) ? json : []);
        }
        catch (err)
        {
            console.error(err);
            setAssets([]);
        }
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
        let data: { type?: string } = {};
        try {
            data = JSON.parse(event.data) as { type?: string };
        }
        catch (err)
        {
            console.error(err);
            return;
        }
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
        if(data.type === "REQUEST_CREATED")
        {
            fetchRequests();
        }
    };
    return () => evtSource.close();
  }, [fetchRequests, fetchActive, fetchInactive, fetchAssets]);

    if (isChecking) {
        return <div className="flex items-center justify-center min-h-screen">Checking permissions...</div>;
    }

    if (!isAuthorized) {
        return null;
    }

    return(
       <header className="">
            <div className="mx-auto px-8 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold"><span className="text-crimson-600">Admin</span> Dashboard</h1>
                        <a>Manage assets and handle asset requests</a>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/home")}
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
            <RequestsView data={requests} onActionComplete={() => { fetchRequests(); fetchActive(); fetchInactive(); }} />
            <ActiveAssetsView data={active} onActionComplete={() => { fetchActive(); fetchInactive(); }} />
            <AssetHistoryView data={inactive}/>
            <EditAssetsView data={assets} />
            
            <button className="m-6 rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700 cursor-pointer" onClick={() => setShowCreatePanel(true)}>Create New Asset</button>
            {showCreatePanel && (
                <CreateAssetsPanel
                    onClose={() => setShowCreatePanel(false)}
                    onCreate={handleCreateAsset}
                    assets={assets}
                />
            )}
        </header>
    );
}