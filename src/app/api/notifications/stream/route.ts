import { requireAdmin } from "@/lib/session";
import { subscribeNotificationEvent } from "@/features/notifications/sse-bus";

const encoder = new TextEncoder();

function toSseChunk(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET() {
  let adminId: string;
  try {
    const admin = await requireAdmin();
    adminId = admin.id;
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(toSseChunk("ready", { ok: true }));

      unsubscribe = subscribeNotificationEvent((event) => {
        if (event.userId !== adminId) return;
        controller.enqueue(toSseChunk("notification", event));
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
