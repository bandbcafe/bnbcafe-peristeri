import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, query, orderBy, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const reservationData = await request.json();

    // Validate required fields
    if (!reservationData.name || !reservationData.phone || !reservationData.date || !reservationData.time || !reservationData.guests) {
      return NextResponse.json(
        { error: 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία' },
        { status: 400 }
      );
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
    if (!phoneRegex.test(reservationData.phone)) {
      return NextResponse.json(
        { error: 'Παρακαλώ εισάγετε έγκυρο αριθμό τηλεφώνου' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (reservationData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reservationData.email)) {
        return NextResponse.json(
          { error: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση email' },
          { status: 400 }
        );
      }
    }

    // Validate date (must be today or future)
    const reservationDate = new Date(reservationData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reservationDate < today) {
      return NextResponse.json(
        { error: 'Δεν μπορείτε να κάνετε κράτηση για παρελθούσα ημερομηνία' },
        { status: 400 }
      );
    }

    // Create reservation object
    const reservation = {
      ...reservationData,
      status: 'pending', // pending, confirmed, cancelled, completed
      createdAt: new Date(),
      updatedAt: new Date(),
      source: reservationData.source || 'website', // Preserve source from request
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'reservations'), reservation);

    // Try to send email notification
    try {
      await sendReservationNotification(reservation, docRef.id);
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      reservationId: docRef.id,
      message: 'Η κράτησή σας καταχωρήθηκε επιτυχώς!'
    });

  } catch (error) {
    console.error('Error saving reservation:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την αποθήκευση της κράτησης' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve reservations (for admin panel)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');

    let reservationsQuery = query(
      collection(db, 'reservations'),
      orderBy('createdAt', 'desc')
    );

    // Add filters if provided
    if (status) {
      reservationsQuery = query(
        collection(db, 'reservations'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      reservationsQuery = query(
        collection(db, 'reservations'),
        where('date', '>=', date),
        where('date', '<', endDate.toISOString().split('T')[0]),
        orderBy('date', 'asc'),
        orderBy('time', 'asc')
      );
    }

    const querySnapshot = await getDocs(reservationsQuery);
    const reservations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
    }));

    return NextResponse.json({ 
      success: true,
      reservations: reservations.slice(0, limit)
    });

  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση κρατήσεων' },
      { status: 500 }
    );
  }
}

async function sendReservationNotification(reservation: any, reservationId: string) {
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

    // Create email template
    const emailTemplate = createReservationEmailTemplate(reservation, reservationId, businessInfo, smtpSettings);
    
    const emailContent = {
      to: smtpSettings.fromEmail, // Send to business email
      subject: `🍽️ Νέα κράτηση: ${reservation.name} - ${reservation.date} ${reservation.time}`,
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

    console.log('Reservation email notification sent successfully');
  } catch (error) {
    console.error('Error sending reservation email notification:', error);
    throw error;
  }
}

function createReservationEmailTemplate(reservation: any, reservationId: string, businessInfo: any, smtpSettings: any) {
  const businessName = businessInfo?.name || '';
  const businessPhone = businessInfo?.phone || '';
  const businessEmail = businessInfo?.email || smtpSettings?.fromEmail || '';
  const businessAddress = businessInfo?.address || '';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const html = `
    <!DOCTYPE html>
    <html lang="el">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Νέα κράτηση τραπεζιού</title>
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
                🍽️ Νέα κράτηση τραπεζιού
              </p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Alert Box -->
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 30px; position: relative;">
            <div style="position: absolute; top: -8px; left: 20px; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ΝΕΑ ΚΡΑΤΗΣΗ
            </div>
            <h2 style="color: #92400e; margin: 10px 0 5px 0; font-size: 18px; font-weight: 600;">
              🎯 Κράτηση ID: ${reservationId.substring(0, 8)}
            </h2>
            <p style="color: #b45309; margin: 0; font-size: 14px;">
              Λάβατε νέα κράτηση τραπεζιού μέσω της ιστοσελίδας σας
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
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${reservation.name}</span>
              </div>
              
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">📱 Τηλέφωνο:</span>
                <a href="tel:${reservation.phone}" style="color: #7c3aed; font-size: 16px; font-weight: 500; text-decoration: none;">${reservation.phone}</a>
              </div>
              
              ${reservation.email ? `
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">📧 Email:</span>
                <a href="mailto:${reservation.email}" style="color: #059669; font-size: 16px; font-weight: 500; text-decoration: none;">${reservation.email}</a>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Reservation Details -->
          <div style="background: linear-gradient(135deg, #ffffff, #f8fafc); border-radius: 16px; padding: 25px; margin-bottom: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
              🍽️ Στοιχεία Κράτησης
            </h3>
            
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">📅 Ημερομηνία:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${formatDate(reservation.date)}</span>
              </div>
              
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #06b6d4;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">🕒 Ώρα:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${reservation.time}</span>
              </div>
              
              <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #84cc16;">
                <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">👥 Άτομα:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${reservation.guests} άτομα</span>
              </div>
            </div>
          </div>

          ${reservation.specialRequests ? `
          <!-- Special Requests -->
          <div style="background: linear-gradient(135deg, #ffffff, #f8fafc); border-radius: 16px; padding: 25px; margin-bottom: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center;">
              📝 Ειδικές Παρατηρήσεις
            </h3>
            <div style="background: white; padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
              <p style="color: #374151; line-height: 1.7; margin: 0; font-size: 16px; white-space: pre-wrap; font-family: 'Georgia', serif;">"${reservation.specialRequests}"</p>
            </div>
          </div>
          ` : ''}

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:${reservation.phone}" 
               style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(5,150,105,0.4); transition: all 0.3s ease;">
              📞 Κλήση Πελάτη
            </a>
            ${reservation.email ? `
            <a href="mailto:${reservation.email}?subject=Επιβεβαίωση κράτησης - ${reservation.date} ${reservation.time}" 
               style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 10px; box-shadow: 0 4px 15px rgba(124,58,237,0.4); transition: all 0.3s ease;">
              ✉️ Email Πελάτη
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
            🤖 Αυτό το email στάλθηκε αυτόματα από το σύστημα κρατήσεων του <strong>${businessName}</strong><br>
            Παρακαλώ επικοινωνήστε με τον πελάτη για επιβεβαίωση της κράτησης.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
ΝΕΑ ΚΡΑΤΗΣΗ ΤΡΑΠΕΖΙΟΥ - ${businessName}

Κράτηση ID: ${reservationId.substring(0, 8)}

ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ:
- Όνομα: ${reservation.name}
- Τηλέφωνο: ${reservation.phone}
${reservation.email ? `- Email: ${reservation.email}` : ''}

ΣΤΟΙΧΕΙΑ ΚΡΑΤΗΣΗΣ:
- Ημερομηνία: ${formatDate(reservation.date)}
- Ώρα: ${reservation.time}
- Άτομα: ${reservation.guests}

${reservation.specialRequests ? `ΕΙΔΙΚΕΣ ΠΑΡΑΤΗΡΗΣΕΙΣ:\n"${reservation.specialRequests}"` : ''}

Για επικοινωνία με τον πελάτη:
- Τηλέφωνο: ${reservation.phone}
${reservation.email ? `- Email: ${reservation.email}` : ''}

---
${businessName}
${businessEmail} | ${businessPhone}
${businessAddress}
  `;

  return { html, text };
}
