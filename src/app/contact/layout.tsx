import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/generatePageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/contact");
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
