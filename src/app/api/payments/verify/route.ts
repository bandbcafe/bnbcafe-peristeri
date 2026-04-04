import { NextRequest, NextResponse } from 'next/server';
import { VivaWalletService } from '@/services/vivaWallet';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, orderCode } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Απαιτείται transaction ID' },
        { status: 400 }
      );
    }

    // Λήψη ρυθμίσεων website από Firestore
    const settingsDoc = await adminDb.collection('website_settings').doc('main').get();
    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: 'Δεν βρέθηκαν ρυθμίσεις πληρωμών' },
        { status: 500 }
      );
    }

    const settings = settingsDoc.data() || {};
    const vivaConfig = settings.paymentSettings?.vivaWallet;

    if (!vivaConfig?.enabled) {
      return NextResponse.json(
        { error: 'Οι πληρωμές με κάρτα δεν είναι διαθέσιμες' },
        { status: 400 }
      );
    }

    // Δημιουργία Viva Wallet service
    const vivaService = new VivaWalletService({
      clientId: vivaConfig.clientId,
      clientSecret: vivaConfig.clientSecret,
      merchantId: vivaConfig.merchantId,
      apiKey: vivaConfig.apiKey,
      sourceCode: vivaConfig.sourceCode,
      testMode: vivaConfig.testMode,
    });

    // Επαλήθευση transaction
    const transaction = await vivaService.verifyTransaction(transactionId);

    // Έλεγχος κατάστασης πληρωμής
    const isSuccessful = transaction.statusId === 'F'; // F = Finished (Successful)
    const isPending = transaction.statusId === 'A'; // A = Active (Pending)

    // Αποθήκευση στο Firestore αν η πληρωμή είναι επιτυχής
    if (isSuccessful) {
      try {
        await adminDb.collection('payments').add({
          transactionId: transactionId,
          orderCode: orderCode || transaction.orderCode,
          amount: transaction.amount, // Μετατροπή από cents
          currency: 'EUR',
          status: 'completed',
          customerEmail: transaction.email,
          customerName: transaction.fullName,
          paymentMethod: 'viva_wallet',
          cardNumber: transaction.cardNumber,
          cardCountryCode: transaction.cardCountryCode,
          createdAt: new Date(),
          vivaTransactionData: transaction,
        });
      } catch (firestoreError) {
        console.error('Error saving payment to Firestore:', firestoreError);
        // Δεν σταματάμε την επιστροφή - η πληρωμή έγινε επιτυχώς
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transactionId,
        orderCode: transaction.orderCode,
        status: transaction.statusId,
        amount: transaction.amount,
        currency: 'EUR',
        customerEmail: transaction.email,
        customerName: transaction.fullName,
        paymentDate: transaction.insDate,
        isSuccessful,
        isPending,
        cardNumber: transaction.cardNumber,
        paymentMethod: transaction.cardNumber ? 'card' : 'other',
      },
    });

  } catch (error) {
    console.error('Error verifying Viva Wallet transaction:', error);
    return NextResponse.json(
      { 
        error: 'Σφάλμα κατά την επαλήθευση της πληρωμής',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint για επαλήθευση με URL parameters (για redirects)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('t');
    const orderCode = searchParams.get('s');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Δεν βρέθηκε transaction ID' },
        { status: 400 }
      );
    }

    // Χρησιμοποιούμε την ίδια λογική με το POST
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ transactionId, orderCode }),
      headers: { 'Content-Type': 'application/json' },
    });

    return await POST(postRequest);

  } catch (error) {
    console.error('Error in GET verify endpoint:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την επαλήθευση' },
      { status: 500 }
    );
  }
}
