import WebSocket, {WebSocketServer} from "ws";
const wss = new WebSocketServer({ port: 8080});

console.log("WebSocketServer running on ws://localhost:8080");

let requestId = 1;

wss.on("connection", (ws) =>
{
    console.log("Client connected");

    ws.send(JSON.stringify({
        type: "info",
        message: "Connected to WebSocket Server"
    }));

    ws.on("close", () =>{
         console.log("Client Disconnected");
    });
});

//simulating new asset ever 4 seconds

setInterval(() => {
    const newRequest = {
        type: "asset_request",
        id: requestId++,
        asset: `Asset-${Math.floor(Math.random() * 100)}`
    };

    console.log("Broadcasting:", newRequest);

    wss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN)
        {
            client.send(JSON.stringify(newRequest));
        }
    });
}, 4000);