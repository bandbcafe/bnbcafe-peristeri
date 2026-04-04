"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaCookie,
  FaShieldAlt,
  FaCog,
  FaChartBar,
  FaAd,
  FaInfoCircle,
} from "react-icons/fa";

export default function CookiePolicyPage() {
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    // Load current cookie preferences
    const consent = localStorage.getItem("cookieConsent");
    if (consent) {
      try {
        setPreferences(JSON.parse(consent));
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    }
  }, []);

  const handleManagePreferences = () => {
    localStorage.removeItem("cookieConsent");
    window.location.href = "";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaCookie className="text-4xl" />
            <h1 className="text-3xl md:text-5xl font-bold">Πολιτική Cookies</h1>
          </div>
          <p className="text-center text-gray-200 text-lg max-w-2xl mx-auto">
            Πληροφορίες σχετικά με τη χρήση cookies στην ιστοσελίδα μας
          </p>
          <p className="text-center text-gray-400 text-sm mt-2">
            Τελευταία ενημέρωση: {new Date().toLocaleDateString("el-GR")}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl bg-gray-50">
        {/* Introduction */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaInfoCircle className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Τι είναι τα Cookies;
            </h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή
            σας όταν επισκέπτεστε μια ιστοσελίδα. Χρησιμοποιούνται ευρέως για να
            κάνουν τις ιστοσελίδες να λειτουργούν πιο αποτελεσματικά, καθώς και
            για να παρέχουν πληροφορίες στους ιδιοκτήτες της ιστοσελίδας.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας στην
            ιστοσελίδα μας, να αναλύσουμε την επισκεψιμότητα και να
            εξατομικεύσουμε το περιεχόμενο.
          </p>
        </section>

        {/* Current Preferences */}
        {preferences && (
          <section className="bg-gray-100 rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCog className="text-[#8B7355]" />
              Οι Τρέχουσες Προτιμήσεις σας
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Απαραίτητα</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Ενεργά
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Λειτουργικά</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      preferences.functional
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {preferences.functional ? "Ενεργά" : "Ανενεργά"}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Ανάλυσης</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      preferences.analytics
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {preferences.analytics ? "Ενεργά" : "Ανενεργά"}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Marketing</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      preferences.marketing
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {preferences.marketing ? "Ενεργά" : "Ανενεργά"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleManagePreferences}
              className="mt-4 w-full px-6 py-3 bg-[#8B7355] hover:bg-[#6B5745] text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Διαχείριση Προτιμήσεων
            </button>
          </section>
        )}

        {/* Types of Cookies */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            Τύποι Cookies που Χρησιμοποιούμε
          </h2>

          <div className="space-y-6">
            {/* Necessary Cookies */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaShieldAlt className="text-green-600 text-xl" />
                <h3 className="text-xl font-semibold text-gray-800">
                  1. Απαραίτητα Cookies
                </h3>
              </div>
              <p className="text-gray-700 mb-3">
                Αυτά τα cookies είναι απαραίτητα για τη βασική λειτουργία της
                ιστοσελίδας και δεν μπορούν να απενεργοποιηθούν.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Παραδείγματα:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                  <li>Session cookies για authentication</li>
                  <li>Cookies ασφαλείας</li>
                  <li>Cookies προτιμήσεων γλώσσας</li>
                  <li>Cookies καλαθιού αγορών</li>
                </ul>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaCog className="text-blue-600 text-xl" />
                <h3 className="text-xl font-semibold text-gray-800">
                  2. Λειτουργικά Cookies
                </h3>
              </div>
              <p className="text-gray-700 mb-3">
                Αυτά τα cookies επιτρέπουν τη λειτουργία βελτιωμένων
                χαρακτηριστικών και εξατομίκευσης.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Παραδείγματα:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                  <li>Αποθήκευση προτιμήσεων χρήστη</li>
                  <li>Απομνημόνευση επιλογών</li>
                  <li>Εξατομικευμένο περιεχόμενο</li>
                  <li>Βελτιωμένη εμπειρία χρήστη</li>
                </ul>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaChartBar className="text-purple-600 text-xl" />
                <h3 className="text-xl font-semibold text-gray-800">
                  3. Cookies Ανάλυσης
                </h3>
              </div>
              <p className="text-gray-700 mb-3">
                Αυτά τα cookies μας βοηθούν να κατανοήσουμε πώς οι επισκέπτες
                αλληλεπιδρούν με την ιστοσελίδα.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Παραδείγματα:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                  <li>Google Analytics</li>
                  <li>Στατιστικά επισκεψιμότητας</li>
                  <li>Ανάλυση συμπεριφοράς χρηστών</li>
                  <li>Βελτίωση περιεχομένου</li>
                </ul>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="border-l-4 border-pink-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <FaAd className="text-pink-600 text-xl" />
                <h3 className="text-xl font-semibold text-gray-800">
                  4. Cookies Marketing
                </h3>
              </div>
              <p className="text-gray-700 mb-3">
                Αυτά τα cookies χρησιμοποιούνται για την εμφάνιση σχετικών
                διαφημίσεων.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Παραδείγματα:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                  <li>Διαφημίσεις στόχευσης</li>
                  <li>Remarketing</li>
                  <li>Social media integration</li>
                  <li>Παρακολούθηση conversions</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How to Manage */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            Πώς να Διαχειριστείτε τα Cookies
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                Μέσω της Ιστοσελίδας μας
              </h3>
              <p className="text-gray-700 mb-3">
                Μπορείτε να διαχειριστείτε τις προτιμήσεις cookies ανά πάσα
                στιγμή:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Κάντε κλικ στο κουμπί "Ρυθμίσεις Cookies" στο footer</li>
                <li>Χρησιμοποιήστε το floating button στην κάτω δεξιά γωνία</li>
                <li>
                  Επισκεφτείτε αυτή τη σελίδα και κάντε κλικ στο κουμπί παραπάνω
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                Μέσω του Browser σας
              </h3>
              <p className="text-gray-700 mb-3">
                Μπορείτε επίσης να διαχειριστείτε τα cookies μέσω των ρυθμίσεων
                του browser σας:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  <strong>Chrome:</strong> Settings → Privacy and Security →
                  Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Options → Privacy & Security →
                  Cookies
                </li>
                <li>
                  <strong>Safari:</strong> Preferences → Privacy → Cookies
                </li>
                <li>
                  <strong>Edge:</strong> Settings → Privacy → Cookies
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Duration */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            Διάρκεια Cookies
          </h2>

          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Session Cookies:
              </h3>
              <p>
                Αυτά τα cookies διαγράφονται αυτόματα όταν κλείνετε τον browser
                σας.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Persistent Cookies:
              </h3>
              <p>
                Αυτά τα cookies παραμένουν στη συσκευή σας για καθορισμένο
                χρονικό διάστημα ή μέχρι να τα διαγράψετε χειροκίνητα. Η
                διάρκεια ποικίλλει ανάλογα με τον τύπο του cookie (από λίγες
                ημέρες έως 2 χρόνια).
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-[#8B7355] rounded-2xl shadow-lg p-6 md:p-8 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Έχετε Ερωτήσεις;
          </h2>
          <p className="mb-4 text-gray-100">
            Εάν έχετε οποιεσδήποτε ερωτήσεις σχετικά με τη χρήση cookies στην
            ιστοσελίδα μας, μη διστάσετε να επικοινωνήσετε μαζί μας.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="px-6 py-3 bg-white text-[#8B7355] rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
            >
              Επικοινωνήστε μαζί μας
            </Link>
            <Link
              href="/privacy"
              className="px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-[#8B7355] transition-colors text-center"
            >
              Πολιτική Απορρήτου
            </Link>
          </div>
        </section>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B7355] hover:bg-[#6B5745] text-white rounded-lg font-semibold transition-colors"
          >
            ← Επιστροφή στην Αρχική
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Όλα τα δικαιώματα κατοχυρωμένα
          </p>
        </div>
      </footer>
    </div>
  );
}
