import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/generatePageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/menu");
}

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
