"use client";

import ActiveAssetsView from "./components/ActiveCheckout";
import AssetHistoryView from "./components/RequestHistory";
import RequestsView from "./components/Requests";
import { AssetCheckout, Asset } from "../types";
import { useEffect, useState, useCallback } from "react";
import EditAssetsView from "./components/ManageAssets";
import CreateAssetsPanel from "./components/CreateAssetsPanel";
import ManageAssetsView from "./components/NewManageAssets";

export default function AdminDashboard() {
  const [requests, setRequests] = useState<AssetCheckout[]>([]);
  const [active, setActive] = useState<AssetCheckout[]>([]);
  const [inactive, setInactive] = useState<AssetCheckout[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [activeButton, setActiveButton] = useState("requests");

  const handleCreateAsset = (newAsset: Asset) => {
    // send to backend
    //we need to do checks here whenever a new asset is created.

    //first we need to check the fields that are referenced

    fetch("/api/assets/edit/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAsset),
    })
      .then((res) => res.json())
      .then((data) => {
        setAssets([...assets, newAsset]);
      });
  };

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/requests");
    if (!res.ok) {
      console.error("API failed:", res.status);
      setRequests([]); // prevent crash
      return;
    }

    const data = await res.json();
    setRequests(data);
  }, []);

  const fetchActive = useCallback(async () => {
    const res = await fetch("/api/requests/active");
    if (!res.ok) {
      console.error("API failed:", res.status);
      setActive([]); // prevent crash
      return;
    }
    const data = await res.json();
    setActive(data);
  }, []);

  const fetchInactive = useCallback(async () => {
    const res = await fetch("/api/requests/inactive");
    if (!res.ok) {
      console.error("API failed:", res.status);
      setInactive([]); // prevent crash
      return;
    }
    setInactive(await res.json());
  }, []);

  const fetchAssets = useCallback(async () => {
    const res = await fetch("/api/assets/get");
    if (!res.ok) {
      console.error("API failed:", res.status);
      setAssets([]); // prevent crash
      return;
    }
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
      if (data.type === "DENIED") {
        fetchRequests();
        fetchInactive();
      }
      if (data.type === "RETURNED") {
        fetchActive();
        fetchInactive();
      }
      if (data.type === "REMOVE_ASSET") {
        fetchAssets();
      }
      if (data.type === "ADD_ASSET") {
        fetchAssets();
      }
    };
    return () => evtSource.close();
  }, [fetchRequests, fetchActive, fetchInactive, fetchAssets]);

  return (
    <div>
      <header className="flex justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold ">Admin Dashboard</h1>
          <a>Manage assets and handle asset requests</a>
        </div>
      </header>

      <div>
        <div className="max-w-6xl mx-auto">
          <div className="flex text-sm font-medium bg-gray-200 p-1 rounded-md w-fit">
            <button
              onClick={() => setActiveButton("requests")}
              className={`cursor-pointer  rounded px-4 py-1 transition ${
                activeButton === "requests" ? "bg-gray-100" : ""
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveButton("assets")}
              className={`cursor-pointer  rounded px-4 py-1 transition ${
                activeButton === "assets" ? "bg-gray-100" : ""
              }`}
            >
              Assets
            </button>
          </div>
          <div>
            {activeButton === "requests" && (
              <>
                <RequestsView data={requests} />
                <ActiveAssetsView data={active} />
                <AssetHistoryView data={inactive} />
              </>
            )}
            {activeButton === "assets" && <ManageAssetsView />}
          </div>
        </div>
      </div>
    </div>
  );
}
