import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { smtp, to } = body as {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        fromName: string;
        fromEmail: string;
        requireTLS?: boolean;
        ignoreTLS?: boolean;
        rejectUnauthorized?: boolean;
      };
      to: string;
    };

    if (!smtp || !to) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }
    if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.fromEmail) {
      return NextResponse.json({ error: "Incomplete SMTP settings" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure, // true for 465, false for 587/25
      requireTLS: smtp.requireTLS ?? false,
      ignoreTLS: smtp.ignoreTLS ?? false,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      // Tighten timeouts to fail fast and surface clearer errors in dev
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: smtp.rejectUnauthorized !== false,
      },
    });

    // Verify connection/config first for clearer diagnostics
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      const errInfo = {
        message: verifyErr?.message,
        code: verifyErr?.code,
        command: verifyErr?.command,
        response: verifyErr?.response,
      };
      return NextResponse.json({ error: "SMTP verify failed", details: errInfo }, { status: 502 });
    }

    const fromName = smtp.fromName?.trim() || smtp.fromEmail;
    const info = await transporter.sendMail({
      from: `${fromName} <${smtp.fromEmail}>`,
      to,
      subject: "Test Email | Order System",
      text: "Αυτό είναι ένα δοκιμαστικό email από το Order System.",
      html: `<p>Αυτό είναι ένα <strong>δοκιμαστικό</strong> email από το Order System.</p>`,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("test-email error", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to send test email",
        code: err?.code,
        command: err?.command,
        response: err?.response,
      },
      { status: 500 }
    );
  }
}
