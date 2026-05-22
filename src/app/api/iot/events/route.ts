import { ingestPassengerEvent, ingestRfidTracking } from "@/lib/iot/ingest";
import { NextResponse } from "next/server";

type EventBody =
  | {
      type: "rfid" | "RFID_STOP";
      payload: {
        uid?: string;
        stopId?: string;
        timestamp?: string;
      };
    }
  | {
      type: "passenger" | "PASSENGER";
      payload: {
        uid?: string;
        bus?: string;
        event?: "masuk" | "keluar" | "in" | "out";
        passenger_count?: number;
        delta?: number;
        timestamp?: string;
      };
    };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EventBody;

    if (body.type === "rfid" || body.type === "RFID_STOP") {
      await ingestRfidTracking(body.payload);
      return NextResponse.json({ ok: true });
    }

    if (body.type === "passenger" || body.type === "PASSENGER") {
      await ingestPassengerEvent(body.payload);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported event type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to ingest event" },
      { status: 500 },
    );
  }
}
