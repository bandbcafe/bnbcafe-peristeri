import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/generatePageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/order");
}

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
