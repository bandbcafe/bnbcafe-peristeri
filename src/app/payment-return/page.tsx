"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

function PaymentReturnPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<
    "loading" | "success" | "failed" | "pending"
  >("loading");
  const [transactionData, setTransactionData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    handlePaymentReturn();
  }, []);

  const handlePaymentReturn = async () => {
    try {
      // Παράμετροι από Viva redirect: ?t=transactionId&s=orderCode
      const transactionId = searchParams.get("t");
      const orderCode = searchParams.get("s");

      if (!transactionId) {
        setStatus("failed");
        setError("Δεν βρέθηκε transaction ID");
        return;
      }

      // Βήμα 1: Verify πληρωμή
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, orderCode }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Σφάλμα επαλήθευσης πληρωμής");
      }

      const verifyData = await verifyResponse.json();
      setTransactionData(verifyData.transaction);

      if (verifyData.transaction.isSuccessful) {
        // Φόρτωση pending order από localStorage
        let pendingOrderData = null;
        try {
          const stored = localStorage.getItem("pendingOrder");
          if (stored) pendingOrderData = JSON.parse(stored);
        } catch (e) {}

        const existingOrderId = pendingOrderData?.existingOrderId;

        // Βήμα 2a: Direct Firestore update (client-side - πιο αξιόπιστο)
        if (existingOrderId) {
          try {
            const orderRef = doc(db, "orders", existingOrderId);
            await updateDoc(orderRef, {
              paymentStatus: "paid",
              vivaTransactionId: transactionId,
              vivaOrderCode: orderCode,
              updatedAt: serverTimestamp(),
            });
            console.log(`[Payment Return] Order ${existingOrderId} updated: paymentStatus=paid`);
            localStorage.setItem("activeOrderId", existingOrderId);
            localStorage.setItem("newOrderCreated", "true");
          } catch (directUpdateError) {
            console.error("[Payment Return] Direct update failed:", directUpdateError);
          }
        }

        // Βήμα 2b: Server-side API call (backup + creates new order if no existingOrderId)
        try {
          const orderResponse = await fetch("/api/orders/create-from-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId,
              orderCode,
              pendingOrderData: {
                ...pendingOrderData,
                existingOrderId: existingOrderId || null,
              },
            }),
          });

          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            localStorage.setItem("activeOrderId", orderData.orderId);
            localStorage.setItem("newOrderCreated", "true");
          } else {
            const errorData = await orderResponse.json().catch(() => ({}));
            console.error("[Payment Return] API call failed:", orderResponse.status, errorData);
          }
        } catch (orderError) {
          console.error("[Payment Return] Error calling API:", orderError);
        }

        // Καθαρισμός
        localStorage.removeItem("customerCart");
        localStorage.removeItem("pendingOrder");
        window.dispatchEvent(new Event("cartUpdated"));

        setStatus("success");
      } else if (verifyData.transaction.isPending) {
        setStatus("pending");
      } else {
        setStatus("failed");
        setError("Η πληρωμή απέτυχε ή ακυρώθηκε");
      }
    } catch (error) {
      setStatus("failed");
      setError(
        error instanceof Error ? error.message : "Σφάλμα επαλήθευσης πληρωμής"
      );
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center">
            <FaSpinner className="animate-spin text-6xl text-[#C9AC7A] mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Επαλήθευση Πληρωμής...
            </h2>
            <p className="text-gray-600">
              Παρακαλώ περιμένετε ενώ επαληθεύουμε την πληρωμή σας
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <FaCheckCircle className="text-6xl text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Πληρωμή Επιτυχής!
            </h2>
            <p className="text-gray-600 mb-6">
              Η πληρωμή σας ολοκληρώθηκε και η παραγγελία σας καταχωρήθηκε
            </p>

            {transactionData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Στοιχεία Συναλλαγής:
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ποσό:</span>
                    <span className="font-medium">
                      €{transactionData.amount?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Μέθοδος:</span>
                    <span className="font-medium">
                      {transactionData.cardNumber ? "Κάρτα" : "Ηλεκτρονική Πληρωμή"}
                    </span>
                  </div>
                  {transactionData.cardNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Κάρτα:</span>
                      <span className="font-medium">
                        {transactionData.cardNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Επιστροφή στην Αρχική
            </button>
          </div>
        );

      case "pending":
        return (
          <div className="text-center">
            <FaExclamationTriangle className="text-6xl text-yellow-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Πληρωμή σε Εκκρεμότητα
            </h2>
            <p className="text-gray-600 mb-6">
              Η πληρωμή σας βρίσκεται σε εκκρεμότητα. Θα ενημερωθείτε για την
              κατάστασή της.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Επιστροφή στην Αρχική
            </button>
          </div>
        );

      case "failed":
        return (
          <div className="text-center">
            <FaTimes className="text-6xl text-red-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Πληρωμή Απέτυχε
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "Η πληρωμή σας δεν ολοκληρώθηκε επιτυχώς"}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/checkout")}
                className="bg-[#C9AC7A] hover:bg-[#9F7D41] text-white px-8 py-3 rounded-lg font-semibold block mx-auto"
              >
                Δοκιμάστε Ξανά
              </button>
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-800 underline block mx-auto"
              >
                Επιστροφή στην Αρχική
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Επεξεργασία πληρωμής...</p>
          </div>
        </div>
      }
    >
      <PaymentReturnPageContent />
    </Suspense>
  );
}
