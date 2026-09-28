import { NextResponse } from "next/server";
import { BOOKING, buildDays } from "@/lib/availability";
import { blockedDates, takenStarts } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const days = buildDays(await blockedDates());
    if (days.length) {
      const first = days[0].slots[0].start;
      const lastDay = days[days.length - 1];
      const taken = await takenStarts(first, lastDay.slots[lastDay.slots.length - 1].start);
      for (const d of days) for (const s of d.slots) s.available = !taken.has(s.start);
    }
    return NextResponse.json(
      { timeZone: BOOKING.timeZone, slotMinutes: BOOKING.slotMinutes, days },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[slots]", err);
    return NextResponse.json({ error: "No se pudo cargar la agenda." }, { status: 503 });
  }
}
