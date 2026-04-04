import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET() {
  try {
    const docRef = doc(db, "website_settings", "main");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const maintenanceMode = data.maintenanceMode;

      return NextResponse.json({
        enabled: maintenanceMode?.enabled || false,
      });
    }

    return NextResponse.json({ enabled: false });
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    return NextResponse.json({ enabled: false }, { status: 500 });
  }
}
