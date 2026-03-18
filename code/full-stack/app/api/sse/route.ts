import { NextRequest, NextResponse } from "next/server";

const clients: Array<(data: any) => void> = [];

export function broadcastEvent(data: any) {
  clients.forEach((send) => send(data));
}

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      clients.push(send);
      send({ type: "INIT" });

      req.signal.addEventListener("abort", () => {
        const index = clients.indexOf(send);
        if (index > -1) clients.splice(index, 1);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}