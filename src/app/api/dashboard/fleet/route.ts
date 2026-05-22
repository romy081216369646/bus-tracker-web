import { getBusCards } from "@/lib/data/buses";
import { NextResponse } from "next/server";

export async function GET() {
  const fleetCards = await getBusCards();
  return NextResponse.json(fleetCards);
}
