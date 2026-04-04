import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// GET - Fetch contact messages for admin panel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitParam = parseInt(searchParams.get('limit') || '50');

    console.log('API called with status:', status, 'limit:', limitParam);
    
    // Use Firebase Admin SDK to fetch messages
    const messagesRef = adminDb.collection('contact_messages');
    let query = messagesRef.orderBy('createdAt', 'desc').limit(limitParam);
    
    // Apply status filter if specified
    if (status && status !== 'all') {
      query = messagesRef.where('status', '==', status).orderBy('createdAt', 'desc').limit(limitParam);
    }

    const querySnapshot = await query.get();
    console.log('Found documents:', querySnapshot.docs.length);
    
    const messages = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      console.log('Document data:', { id: doc.id, ...data });
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      };
    });

    console.log('Processed messages:', messages.length, 'messages');

    return NextResponse.json({ 
      success: true,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση μηνυμάτων' },
      { status: 500 }
    );
  }
}

// PATCH - Update message status
export async function PATCH(request: NextRequest) {
  try {
    const { messageId, status } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { error: 'Απαιτούνται τα πεδία messageId και status' },
        { status: 400 }
      );
    }

    const validStatuses = ['new', 'read', 'replied'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Μη έγκυρη κατάσταση μηνύματος' },
        { status: 400 }
      );
    }

    // Update message status using Firebase Admin SDK
    const messageRef = adminDb.collection('contact_messages').doc(messageId);
    await messageRef.update({
      status,
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Η κατάσταση του μηνύματος ενημερώθηκε επιτυχώς'
    });

  } catch (error) {
    console.error('Error updating message status:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ενημέρωση της κατάστασης' },
      { status: 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(request: NextRequest) {
  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Απαιτείται το πεδίο messageId' },
        { status: 400 }
      );
    }

    // Delete message using Firebase Admin SDK
    const messageRef = adminDb.collection('contact_messages').doc(messageId);
    await messageRef.delete();

    return NextResponse.json({ 
      success: true,
      message: 'Το μήνυμα διαγράφηκε επιτυχώς'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά τη διαγραφή του μηνύματος' },
      { status: 500 }
    );
  }
}
