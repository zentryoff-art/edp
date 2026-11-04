import { NextResponse } from "next/server";
import { sendMetaCapiEvent } from "@/lib/meta-capi";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "ViewContent";
    const eventId = typeof body.eventId === "string" ? body.eventId : undefined;
    const eventSourceUrl = typeof body.eventSourceUrl === "string" ? body.eventSourceUrl : "https://www.estudiodigitalpro.com/llamada";
    const attribution = typeof body.attribution === "object" && body.attribution ? body.attribution : {};
    const customData = typeof body.customData === "object" && body.customData ? body.customData : undefined;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const res = await sendMetaCapiEvent({
      eventName,
      eventId,
      eventSourceUrl,
      user: {
        ip,
        userAgent,
        fbp: attribution.fbp,
        fbc: attribution.fbc,
      },
      customData,
    });

    return NextResponse.json({ ok: true, capi: res });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

