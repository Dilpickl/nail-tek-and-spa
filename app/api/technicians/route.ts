import { NextResponse } from "next/server";

import { getActiveTechnicians } from "@/lib/booking/technicians";

export async function GET() {
  try {
    const technicians = await getActiveTechnicians();
    return NextResponse.json({
      technicians: technicians.map((technician) => ({
        id: technician.id,
        name: technician.name,
        role: technician.role,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unable to load technicians." },
      { status: 500 }
    );
  }
}
