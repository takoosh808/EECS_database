// app/api/requests/sseHelpers.ts
import {asset_update} from "../../../types"

// Keep connected clients in memory
const clients = new Set<(data: any) => void>();

export function addClient(send: (data: any) => void) {
  clients.add(send);
}

export function removeClient(send: (data: any) => void) {
  clients.delete(send);
}

// Broadcast to all connected clients
export function broadcastRequestUpdate(payload: asset_update) {
  for (const send of clients) {
    send({ type: "asset_update", payload });
  }
}