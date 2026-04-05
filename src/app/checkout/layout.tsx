import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/generatePageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("/checkout");
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
