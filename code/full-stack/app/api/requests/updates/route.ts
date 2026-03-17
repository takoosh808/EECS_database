// app/api/requests/updates/route.ts
import { addClient, removeClient } from "../updates/sseHelper";

export async function GET(req: Request) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = (data: any) => {
    writer.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  addClient(send);

  req.signal.addEventListener("abort", () => {
    removeClient(send);
    writer.close();
  });

  send({ type: "connected" });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}