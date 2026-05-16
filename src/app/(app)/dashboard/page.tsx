import { getBusCards } from "@/lib/data/buses";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const fleetCards = await getBusCards();

  return <DashboardClient fleetCards={fleetCards} />;
}
