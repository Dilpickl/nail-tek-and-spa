import { NextResponse } from "next/server";

import {
  getAvailableSlots,
  getServicesByIds,
  type TechnicianSelection,
} from "@/lib/booking/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const technicianId = (searchParams.get("technicianId") ||
    "any") as TechnicianSelection;
  const serviceIds = searchParams.getAll("serviceId");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }

  if (serviceIds.length === 0) {
    return NextResponse.json(
      { error: "At least one service is required." },
      { status: 400 }
    );
  }

  try {
    getServicesByIds(serviceIds);
  } catch {
    return NextResponse.json(
      { error: "One or more selected services are invalid." },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots({ date, serviceIds, technicianId });
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Availability lookup failed", error);
    return NextResponse.json(
      { error: "Unable to load availability right now." },
      { status: 500 }
    );
  }
}
