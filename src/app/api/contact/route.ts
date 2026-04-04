import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, subject, message } = await request.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση email' },
        { status: 400 }
      );
    }

    // Create contact message object
    const contactMessage = {
      name,
      email,
      phone: phone || '',
      subject,
      message,
      status: 'new', // new, read, replied
      createdAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    // Save to Firestore
    console.log('Saving contact message:', contactMessage);
    const docRef = await addDoc(collection(db, 'contact_messages'), contactMessage);
    console.log('Message saved with ID:', docRef.id);

    // Try to send email notification (if SMTP is configured)
    try {
      await sendEmailNotification(contactMessage);
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      messageId: docRef.id,
      message: 'Το μήνυμά σας στάλθηκε επιτυχώς!'
    });

  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την αποστολή του μηνύματος' },
      { status: 500 }
    );
  }
}

function createProfessionalEmailTemplate(contactMessage: any, businessInfo: any, smtpSettings: any) {
  const businessName = businessInfo?.name || '';
  const businessPhone = businessInfo?.phone || '';
  const businessEmail = businessInfo?.email || smtpSettings?.fromEmail || '';
  const businessAddress = businessInfo?.address || '';
  
  const subjectTranslations = {
    'order': 'Παραγγελία',
    'reservation': 'Κράτηση',
    'complaint': 'Παράπονο',
    'suggestion': 'Πρόταση',
    'other': 'Άλλο'
  };

  const html = `
    <!DOCTYPE html>
    <html lang="el">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Νέο μήνυμα επικοινωνίας</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.3;"></div>
          <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.2;"></div>
          
          <div style="position: relative; z-index: 2;">
            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              ${businessName}
            </h1>
            <div style="background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 25px; display: inline-block; margin-top: 10px;">
              <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 500;">
                📧 Νέο μήνυμα επικοινωνίας
              </p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Alert Box -->
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 30px; position: relative;">
            <div style="position: absolute; top: -8px; left: 20px; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ΝΕΟΣ ΠΕΛΑΤΗΣ
            </div>
            <h2 style="color: #92400e; margin: 10px 0 5px 0; font-size: 18px; font-weight: 600;">
              🎯 ${subjectTranslations[contactMessage.subject as keyof typeof subjectTranslations] || contactMessage.subject}
            </h2>
            <p style="color: #b45309; margin: 0; font-size: 14px;">
              Λάβατε νέο μήνυμα από πελάτη μέσω της ιστοσελίδας σας
            </p>
          </div>

          <!-- Customer Info -->
          <div style="background: #f8fafc; border-radius: 16px; padding: 25px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
              👤 Στοιχεία Πελάτη
            </h3>
            
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">👨‍💼 Όνομα:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${contactMessage.name}</span>
              </div>
              
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">📧 Email:</span>
                <a href="mailto:${contactMessage.email}" style="color: #059669; font-size: 16px; font-weight: 500; text-decoration: none;">${contactMessage.email}</a>
              </div>
              
              ${contactMessage.phone ? `
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">📱 Τηλέφωνο:</span>
                <a href="tel:${contactMessage.phone}" style="color: #7c3aed; font-size: 16px; font-weight: 500; text-decoration: none;">${contactMessage.phone}</a>
              </div>
              ` : ''}
              
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">🕒 Ημερομηνία:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${contactMessage.createdAt.toLocaleString('el-GR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            </div>
          </div>

          <!-- Message -->
          <div style="background: linear-gradient(135deg, #ffffff, #f8fafc); border-radius: 16px; padding: 25px; margin-bottom: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
              💬 Μήνυμα Πελάτη
            </h3>
            <div style="background: white; padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
              <p style="color: #374151; line-height: 1.7; margin: 0; font-size: 16px; white-space: pre-wrap; font-family: 'Georgia', serif;">"${contactMessage.message}"</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${contactMessage.email}?subject=Re: ${contactMessage.subject}" 
               style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(5,150,105,0.4); transition: all 0.3s ease;">
              ✉️ Απάντηση στον Πελάτη
            </a>
            ${contactMessage.phone ? `
            <a href="tel:${contactMessage.phone}" 
               style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(124,58,237,0.4); transition: all 0.3s ease;">
              📞 Κλήση
            </a>
            ` : ''}
          </div>

          <!-- Business Info -->
          <div style="background: linear-gradient(135deg, #1e293b, #334155); border-radius: 16px; padding: 25px; color: white; text-align: center;">
            <h4 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #f1f5f9;">
              📍 ${businessName}
            </h4>
            <div style="display: grid; gap: 8px; font-size: 14px; color: #cbd5e1;">
              <div>📧 ${businessEmail}</div>
              <div>📱 ${businessPhone}</div>
              <div>🏠 ${businessAddress}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.5;">
            🤖 Αυτό το email στάλθηκε αυτόματα από το σύστημα επικοινωνίας του <strong>${businessName}</strong><br>
            Παρακαλώ μην απαντήσετε σε αυτό το email. Χρησιμοποιήστε τα κουμπιά παραπάνω για επικοινωνία.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
ΝΕΟΣ ΠΕΛΑΤΗΣ - ${businessName}

Θέμα: ${subjectTranslations[contactMessage.subject as keyof typeof subjectTranslations] || contactMessage.subject}

ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ:
- Όνομα: ${contactMessage.name}
- Email: ${contactMessage.email}
${contactMessage.phone ? `- Τηλέφωνο: ${contactMessage.phone}` : ''}
- Ημερομηνία: ${contactMessage.createdAt.toLocaleString('el-GR')}

ΜΗΝΥΜΑ:
"${contactMessage.message}"

Για απάντηση στον πελάτη: ${contactMessage.email}
${contactMessage.phone ? `Για κλήση: ${contactMessage.phone}` : ''}

---
${businessName}
${businessEmail} | ${businessPhone}
${businessAddress}
  `;

  return { html, text };
}

async function sendEmailNotification(contactMessage: any) {
  try {
    // Get SMTP settings
    const smtpDoc = await getDoc(doc(db, 'config', 'smtp'));
    if (!smtpDoc.exists()) {
      throw new Error('SMTP settings not found');
    }

    const smtpSettings = smtpDoc.data();
    
    // Get business info for email template
    const settingsDoc = await getDoc(doc(db, 'config', 'settings'));
    const businessInfo = settingsDoc.exists() ? settingsDoc.data()?.businessInfo : null;

    // Create professional email template
    const emailTemplate = createProfessionalEmailTemplate(contactMessage, businessInfo, smtpSettings);
    
    const emailContent = {
      to: smtpSettings.fromEmail, // Send to business email from SMTP settings
      subject: `🔔 Νέο μήνυμα επικοινωνίας: ${contactMessage.subject}`,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    // Send email using the email API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send email notification');
    }

    console.log('Email notification sent successfully');
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

// GET endpoint to retrieve contact messages (for admin panel)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // This would typically require authentication
    // For now, we'll return a simple response
    
    return NextResponse.json({ 
      success: true,
      message: 'Contact messages endpoint - requires authentication'
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση μηνυμάτων' },
      { status: 500 }
    );
  }
}
