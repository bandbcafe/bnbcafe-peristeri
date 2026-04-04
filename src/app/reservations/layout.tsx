import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/generatePageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/reservations");
}

export default function ReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
