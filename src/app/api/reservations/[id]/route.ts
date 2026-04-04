import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Update reservation status
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { status, tableNumber, pricePerPerson, deposit, notes } = await request.json();
    const params = await context.params;
    const reservationId = params.id;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Μη έγκυρη κατάσταση κράτησης' },
        { status: 400 }
      );
    }

    // Get current reservation
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      return NextResponse.json(
        { error: 'Η κράτηση δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (pricePerPerson !== undefined) updateData.pricePerPerson = Number(pricePerPerson);
    if (deposit !== undefined) updateData.deposit = Number(deposit);
    if (notes !== undefined) updateData.notes = notes;

    // Update reservation
    await updateDoc(reservationRef, updateData);

    // Send email notification if status changed to confirmed or cancelled
    if (status === 'confirmed' || status === 'cancelled') {
      try {
        await sendStatusUpdateEmail(reservationDoc.data(), status);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Η κράτηση ενημερώθηκε επιτυχώς'
    });

  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ενημέρωση της κράτησης' },
      { status: 500 }
    );
  }
}

// Delete reservation
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const reservationId = params.id;

    // Get reservation before deleting for email notification
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      return NextResponse.json(
        { error: 'Η κράτηση δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Delete reservation
    await deleteDoc(reservationRef);

    // Send cancellation email if customer has email
    const reservationData = reservationDoc.data();
    if (reservationData.email) {
      try {
        await sendStatusUpdateEmail(reservationData, 'cancelled');
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Η κράτηση διαγράφηκε επιτυχώς'
    });

  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την διαγραφή της κράτησης' },
      { status: 500 }
    );
  }
}

async function sendStatusUpdateEmail(reservation: any, newStatus: string) {
  if (!reservation.email) return;

  try {
    // Get SMTP settings
    const smtpDoc = await getDoc(doc(db, 'config', 'smtp'));
    if (!smtpDoc.exists()) {
      throw new Error('SMTP settings not found');
    }

    const smtpSettings = smtpDoc.data();
    
    // Get business info
    const settingsDoc = await getDoc(doc(db, 'config', 'settings'));
    const businessInfo = settingsDoc.exists() ? settingsDoc.data()?.businessInfo : null;

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

    const statusTexts = {
      confirmed: {
        title: 'Επιβεβαίωση Κράτησης',
        message: 'Η κράτησή σας έχει επιβεβαιωθεί!',
        color: '#059669',
        icon: '✅'
      },
      cancelled: {
        title: 'Ακύρωση Κράτησης',
        message: 'Η κράτησή σας έχει ακυρωθεί.',
        color: '#dc2626',
        icon: '❌'
      }
    };

    const statusInfo = statusTexts[newStatus as keyof typeof statusTexts];
    if (!statusInfo) return;

    const emailTemplate = {
      html: `
        <!DOCTYPE html>
        <html lang="el">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${statusInfo.title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">
                ${businessName}
              </h1>
              <div style="background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 25px; display: inline-block;">
                <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 500;">
                  ${statusInfo.icon} ${statusInfo.title}
                </p>
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              
              <!-- Status Message -->
              <div style="background: ${statusInfo.color}15; border: 2px solid ${statusInfo.color}; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: ${statusInfo.color}; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
                  ${statusInfo.message}
                </h2>
                <p style="color: ${statusInfo.color}; margin: 0; font-size: 16px;">
                  Αγαπητέ/ή ${reservation.name}
                </p>
              </div>

              <!-- Reservation Details -->
              <div style="background: #f8fafc; border-radius: 16px; padding: 25px; margin-bottom: 25px;">
                <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                  📋 Στοιχεία Κράτησης
                </h3>
                
                <div style="display: grid; gap: 15px;">
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px;">
                    <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">📅 Ημερομηνία:</span>
                    <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${formatDate(reservation.date)}</span>
                  </div>
                  
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px;">
                    <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">🕒 Ώρα:</span>
                    <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${reservation.time}</span>
                  </div>
                  
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px;">
                    <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">👥 Άτομα:</span>
                    <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${reservation.guests} άτομα</span>
                  </div>

                  ${reservation.tableNumber ? `
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px;">
                    <span style="color: #475569; font-weight: 600; min-width: 100px; font-size: 14px;">🪑 Τραπέζι:</span>
                    <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${reservation.tableNumber}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              ${newStatus === 'confirmed' ? `
              <!-- Instructions for Confirmed -->
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #047857; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
                  📍 Οδηγίες Άφιξης
                </h3>
                <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Παρακαλώ φτάστε 10 λεπτά πριν την ώρα κράτησης</li>
                  <li>Το τραπέζι διατηρείται για 15 λεπτά από την ώρα κράτησης</li>
                  <li>Για ακύρωση, παρακαλώ ενημερώστε μας τουλάχιστον 2 ώρες νωρίτερα</li>
                </ul>
              </div>
              ` : ''}

              ${newStatus === 'cancelled' ? `
              <!-- Cancellation Message -->
              <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <p style="color: #dc2626; margin: 0; line-height: 1.6;">
                  Λυπούμαστε για την ακύρωση. Θα χαρούμε να σας εξυπηρετήσουμε σε μελλοντική ευκαιρία. 
                  Μπορείτε να κάνετε νέα κράτηση ανά πάσα στιγμή μέσω της ιστοσελίδας μας ή τηλεφωνικά.
                </p>
              </div>
              ` : ''}

              <!-- Contact Info -->
              <div style="background: linear-gradient(135deg, #1e293b, #334155); border-radius: 16px; padding: 25px; color: white; text-align: center;">
                <h4 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #f1f5f9;">
                  📞 Επικοινωνία
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
                Σας ευχαριστούμε για την εμπιστοσύνη σας στο <strong>${businessName}</strong><br>
                Αυτό το email στάλθηκε αυτόματα. Παρακαλώ μην απαντήσετε.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${statusInfo.title} - ${businessName}

Αγαπητέ/ή ${reservation.name},

${statusInfo.message}

ΣΤΟΙΧΕΙΑ ΚΡΑΤΗΣΗΣ:
- Ημερομηνία: ${formatDate(reservation.date)}
- Ώρα: ${reservation.time}
- Άτομα: ${reservation.guests}
${reservation.tableNumber ? `- Τραπέζι: ${reservation.tableNumber}` : ''}

${newStatus === 'confirmed' ? `
ΟΔΗΓΙΕΣ ΑΦΙΞΗΣ:
- Παρακαλώ φτάστε 10 λεπτά πριν την ώρα κράτησης
- Το τραπέζι διατηρείται για 15 λεπτά από την ώρα κράτησης
- Για ακύρωση, παρακαλώ ενημερώστε μας τουλάχιστον 2 ώρες νωρίτερα
` : ''}

${newStatus === 'cancelled' ? `
Λυπούμαστε για την ακύρωση. Θα χαρούμε να σας εξυπηρετήσουμε σε μελλοντική ευκαιρία.
` : ''}

ΕΠΙΚΟΙΝΩΝΙΑ:
${businessEmail} | ${businessPhone}
${businessAddress}

---
${businessName}
      `
    };
    
    const emailContent = {
      to: reservation.email,
      subject: `${statusInfo.icon} ${statusInfo.title} - ${businessName}`,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    // Send email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send status update email');
    }

    console.log(`Status update email sent to ${reservation.email} for status: ${newStatus}`);
  } catch (error) {
    console.error('Error sending status update email:', error);
    throw error;
  }
}
