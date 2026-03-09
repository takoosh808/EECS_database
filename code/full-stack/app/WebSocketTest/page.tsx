"use client";
import { useEffect, useState } from "react";
import {AssetRequest} from "../types";
export default function Dashboard() {

  const [requests, setRequests] = useState<AssetRequest[]>([]);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    ws.onopen = () => {
      console.log("Connected to server");
    };

    ws.onmessage = (event) => {

      const data = JSON.parse(event.data);

      if (data.type === "asset_request") {
        setRequests(prev => [...prev, data]);
      }

      if (data.type === "info") {
        console.log(data.message);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => ws.close();

  }, []);

  return (
    <div>
      <h1>Live Asset Requests</h1>

      <ul>
        {requests.map(r => (
          <li key={r.id}>
            Request #{r.id} → {r.asset_id}
          </li>
        ))}
      </ul>

    </div>
  );
}