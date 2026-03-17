"use client";

import ActiveAssetsView from "./components/ActiveCheckout";
import AssetHistoryView from "./components/RequestHistory";
import RequestsView from "./components/Requests";
import {AssetCheckout, Asset} from "../types";
import { useEffect, useState, useCallback} from "react";
import EditAssetsView from "./components/EditAssets";

export default function AdminDashboard()
{
    const[requests, setRequests] = useState<AssetCheckout[]>([]);
    const[active, setActive] = useState<AssetCheckout[]>([]);
    const[inactive, setInactive] = useState<AssetCheckout[]>([]);
    const[assets, setState] = useState<Asset[]>([]);
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
        setState(await res.json());
    }, []);

    useEffect(() => {
        fetchRequests();
        fetchActive();
        fetchInactive();
        fetchAssets();
    }, [fetchRequests, fetchActive, fetchInactive, fetchAssets]);

    useEffect(() => {
        const evtSource = new EventSource("/api/requests/sse");
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
    };
    return () => evtSource.close();
  }, [fetchRequests, fetchActive, fetchInactive]);

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
        </header>
    );
}