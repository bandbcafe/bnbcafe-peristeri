import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import nodemailer from "nodemailer";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, message, supplierId, supplierName } = body as {
      to: string;
      subject?: string;
      message: string;
      supplierId?: number | string;
      supplierName?: string;
    };

    if (!to || !message) {
      return NextResponse.json({ error: "Missing 'to' or 'message'" }, { status: 400 });
    }

    // Load SMTP settings from Firestore
    const smtpRef = doc(db, "config", "smtp");
    const snap = await getDoc(smtpRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: "SMTP settings not found" }, { status: 500 });
    }

    // Load business info from Firestore
    const settingsRef = doc(db, "config", "settings");
    const settingsSnap = await getDoc(settingsRef);
    const businessInfo = settingsSnap.exists() && settingsSnap.data().businessInfo
      ? settingsSnap.data().businessInfo
      : {
          storeName: "Το Κατάστημά μας",
          address: "",
          city: "",
          postalCode: "",
          phone: "",
          email: "",
          taxId: "",
        };
    const smtp = snap.data() as {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      fromName?: string;
      fromEmail: string;
      requireTLS?: boolean;
      ignoreTLS?: boolean;
      rejectUnauthorized?: boolean;
    };

    if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.fromEmail) {
      return NextResponse.json({ error: "Incomplete SMTP settings" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: smtp.requireTLS ?? false,
      ignoreTLS: smtp.ignoreTLS ?? false,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: smtp.rejectUnauthorized !== false },
    });

    // Verify connection first for clearer errors
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      return NextResponse.json(
        { error: "SMTP verify failed", details: { message: verifyErr?.message, code: verifyErr?.code } },
        { status: 500 }
      );
    }


    const defaultSubject = subject?.trim() || `Παραγγελία από ${businessInfo.storeName}`;

    const intro = "Θα θέλαμε να μας αποστείλετε την παρακάτω παραγγελία:";

    // Build address line
    const addressLine = businessInfo.address
      ? `${businessInfo.address}${businessInfo.city ? ', ' + businessInfo.city : ''}`
      : businessInfo.city || "";

    // Build contact line
    const contactParts = [];
    if (businessInfo.phone) contactParts.push(`Τηλέφωνο: ${businessInfo.phone}`);
    if (businessInfo.email) contactParts.push(`email: ${businessInfo.email}`);
    const contactLine = contactParts.length > 0 ? contactParts.join(' • ') : "";

    const signature = `
      <div style="margin-top:16px;color:#444;font-size:13px;line-height:1.4">
        <p style="margin:0 0 6px 0">Με εκτίμηση,</p>
        <div>
          <div><b>Ομάδα του ${businessInfo.storeName}</b></div>
          ${addressLine ? `<div>${addressLine}</div>` : ""}
          ${contactLine ? `<div>${contactLine}</div>` : ""}
          ${businessInfo.taxId ? `<div><b>ΑΦΜ ${businessInfo.taxId}</b></div>` : ""}
        </div>
        <p style="margin-top:10px;color:#777;font-size:12px">do not reply to this email</p>
      </div>
    `;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
        <p>${intro}</p>
        <pre style="white-space:pre-wrap;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:6px;padding:12px">${
          String(message || "").replace(/</g, "&lt;")
        }</pre>
        ${signature}
      </div>
    `;

    const mailOptions: any = {
      from: smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail,
      to,
      subject: defaultSubject,
      text: `${intro}\n\n${message}\n\n— Ομάδα του ${businessInfo.storeName} — Μην απαντάτε σε αυτό το email`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log to Firestore: successful order email
    try {
      await addDoc(collection(db, "email_orders"), {
        to,
        subject: defaultSubject,
        message,
        supplierId: supplierId ?? null,
        supplierName: supplierName ?? null,
        messageId: info.messageId || null,
        createdAt: serverTimestamp(),
        status: "sent",
      });
    } catch (logErr) {
      // Don't fail the response if logging fails; just include a flag
      return NextResponse.json({ ok: true, messageId: info.messageId, logged: false });
    }

    return NextResponse.json({ ok: true, messageId: info.messageId, logged: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Send failed", details: { message: err?.message, code: err?.code } },
      { status: 500 }
    );
  }
}
