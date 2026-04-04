import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import nodemailer from "nodemailer";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text, type = 'general' } = body as {
      to: string;
      subject: string;
      html?: string;
      text?: string;
      type?: string;
    };

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ 
        error: "Missing required fields: 'to', 'subject', and either 'html' or 'text'" 
      }, { status: 400 });
    }

    // Load SMTP settings from Firestore
    const smtpRef = doc(db, "config", "smtp");
    const snap = await getDoc(smtpRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: "SMTP settings not found" }, { status: 500 });
    }

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
        { 
          error: "SMTP connection failed", 
          details: { message: verifyErr?.message, code: verifyErr?.code } 
        },
        { status: 500 }
      );
    }

    const mailOptions: any = {
      from: smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail,
      to,
      subject,
      ...(html && { html }),
      ...(text && { text }),
    };

    const info = await transporter.sendMail(mailOptions);

    // Log to Firestore
    try {
      await addDoc(collection(db, "email_logs"), {
        to,
        subject,
        type,
        messageId: info.messageId || null,
        createdAt: serverTimestamp(),
        status: "sent",
      });
    } catch (logErr) {
      console.error("Failed to log email:", logErr);
      // Don't fail the response if logging fails
    }

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: "Email sent successfully"
    });

  } catch (err: any) {
    console.error("Email send error:", err);
    return NextResponse.json(
      { 
        error: "Failed to send email", 
        details: { message: err?.message, code: err?.code } 
      },
      { status: 500 }
    );
  }
}
