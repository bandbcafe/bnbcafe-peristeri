import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { clearSettingsCache } from "@/lib/getWebsiteSettings";
import { clearDeliveryCache } from "@/app/api/delivery/settings/route";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-revalidate-secret",
};

/** OPTIONS - CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/revalidate
 * Called by ordio after syncing settings to clear all caches.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify secret to prevent unauthorized cache clears
    const secret = request.headers.get("x-revalidate-secret");
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // 1. Clear server-side in-memory caches
    clearSettingsCache();
    clearDeliveryCache();

    // 2. Revalidate all cached pages
    revalidatePath("/", "layout");

    // 3. Update a version timestamp in Firestore so client tabs can detect changes
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      await adminDb.collection("website_settings").doc("_version").set({
        updatedAt: Date.now(),
        source: "revalidate",
      });
    } catch (e) {
      console.error("[Revalidate] Failed to update version doc:", e);
    }

    console.log("[Revalidate] All caches cleared successfully");

    return NextResponse.json(
      {
        success: true,
        cleared: ["settings", "delivery", "pages"],
        timestamp: Date.now(),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[Revalidate] Error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500, headers: corsHeaders }
    );
  }
}
