import { NextRequest, NextResponse } from 'next/server';
import { VivaWalletService } from '@/services/vivaWallet';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      customerInfo,
      orderDetails,
      cartItems,
      paymentMethod,
      subtotal,
      vat,
      deliveryFee,
      deliveryAddress,
      existingOrderId,
    } = body;

    // Validation
    if (!amount || amount < 0.30) {
      return NextResponse.json(
        { error: 'Το ποσό πρέπει να είναι τουλάχιστον €0.30' },
        { status: 400 }
      );
    }

    if (!customerInfo?.email) {
      return NextResponse.json(
        { error: 'Απαιτούνται στοιχεία πελάτη (email)' },
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
    const paymentSettings = settings.paymentSettings;

    // Έλεγχος αν το Viva Wallet είναι ενεργοποιημένο
    if (!paymentSettings?.vivaWallet?.enabled) {
      return NextResponse.json(
        { error: 'Οι πληρωμές με κάρτα δεν είναι διαθέσιμες' },
        { status: 400 }
      );
    }

    const vivaConfig = paymentSettings.vivaWallet;

    // Έλεγχος ότι όλα τα απαραίτητα στοιχεία υπάρχουν
    if (!vivaConfig.clientId || !vivaConfig.clientSecret || !vivaConfig.sourceCode) {
      return NextResponse.json(
        { error: 'Ελλιπής ρύθμιση Viva Wallet' },
        { status: 500 }
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

    const fullName = customerInfo.fullName ||
      `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim();

    // Δημιουργία περιγραφής παραγγελίας
    const customerDescription = cartItems && cartItems.length > 0
      ? `Παραγγελία: ${cartItems.map((item: any) => `${item.name} x${item.quantity}`).join(', ')}`
      : orderDetails?.description || 'Παραγγελία από το κατάστημα';

    const merchantDescription = `Παραγγελία #${Date.now()} - ${fullName}`;

    // Δημιουργία payment order
    const paymentOrder = await vivaService.createPaymentOrder({
      amount: Math.round(amount * 100), // Μετατροπή σε cents
      customerTrns: customerDescription,
      customer: {
        email: customerInfo.email,
        fullName: fullName,
        phone: customerInfo.phone,
        countryCode: customerInfo.countryCode || 'GR',
        requestLang: 'el-GR',
      },
      sourceCode: vivaConfig.sourceCode,
      merchantTrns: merchantDescription,
      paymentTimeout: 1800, // 30 λεπτά
      tags: [
        'online-order',
        'website',
        ...(orderDetails?.tags || [])
      ],
    });

    // Αποθήκευση pending order στο Firestore (backup αν χαθεί το localStorage)
    try {
      await adminDb.collection('pending_orders').doc(paymentOrder.orderCode).set({
        orderCode: paymentOrder.orderCode,
        customerInfo: {
          id: customerInfo.id || customerInfo.customerId || '',
          firstName: customerInfo.firstName || '',
          lastName: customerInfo.lastName || '',
          email: customerInfo.email || '',
          phone: customerInfo.phone || '',
        },
        cartItems: (cartItems || []).map((item: any) => ({
          id: item.id || item.product?.id || '',
          name: item.name || item.product?.name || '',
          price: Number(item.price || item.basePrice) || 0,
          quantity: Number(item.quantity) || 1,
          totalPrice: Number(item.totalPrice) || 0,
          vatRate: Number(item.vatRate) || 24,
          notes: item.notes || '',
          selectedOptions: (item.selectedOptions || []).map((opt: any) => ({
            groupName: opt.groupName || opt.name || '',
            name: opt.name || '',
            price: Number(opt.price) || 0,
          })),
        })),
        paymentMethod: paymentMethod || 'creditCard',
        subtotal: Number(subtotal) || 0,
        vat: Number(vat) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        total: Number(amount) || 0,
        deliveryAddress: deliveryAddress || null,
        status: 'pending_payment',
        ...(existingOrderId ? { existingOrderId } : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (pendingError) {
      console.error('Error saving pending order:', pendingError);
      // Δεν σταματάμε - η πληρωμή μπορεί να γίνει και χωρίς backup
    }

    // Δημιουργία checkout URL
    const checkoutUrl = vivaService.getCheckoutUrl(paymentOrder.orderCode);

    return NextResponse.json({
      success: true,
      orderCode: paymentOrder.orderCode,
      checkoutUrl,
      amount: amount,
      currency: 'EUR',
    });

  } catch (error) {
    console.error('Error creating Viva Wallet payment order:', error);
    return NextResponse.json(
      {
        error: 'Σφάλμα κατά τη δημιουργία της παραγγελίας πληρωμής',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
