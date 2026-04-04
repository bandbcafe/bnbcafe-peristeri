"use client";

import React from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import {
  FaFileContract,
  FaShoppingCart,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaBalanceScale,
} from "react-icons/fa";

interface WebsiteSettings {
  contactInfo?: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  heroSection?: {
    title: string;
  };
}

export default function TermsOfServicePage() {
  const { websiteSettings: settings } = useWebsiteSettings();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaFileContract className="text-4xl" />
            <h1 className="text-3xl md:text-5xl font-bold">Όροι Χρήσης</h1>
          </div>
          <p className="text-center text-gray-200 text-lg max-w-2xl mx-auto">
            Παρακαλούμε διαβάστε προσεκτικά τους όρους χρήσης πριν
            χρησιμοποιήσετε τις υπηρεσίες μας
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            Εισαγωγή
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Καλώς ήρθατε στην πλατφόρμα online παραγγελιών και κρατήσεων μας. Οι
            παρόντες Όροι Χρήσης διέπουν τη χρήση της ιστοσελίδας και των
            υπηρεσιών μας. Με την πρόσβαση και χρήση της πλατφόρμας, αποδέχεστε
            πλήρως και ανεπιφύλακτα τους παρόντες όρους.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Εάν δεν συμφωνείτε με οποιονδήποτε από τους όρους αυτούς,
            παρακαλούμε μην χρησιμοποιείτε την πλατφόρμα μας.
          </p>
        </section>

        {/* Definitions */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            1. Ορισμοί
          </h2>

          <div className="space-y-3 text-gray-700">
            <p>
              <strong>"Πλατφόρμα"</strong> ή <strong>"Ιστοσελίδα":</strong> Η
              παρούσα διαδικτυακή εφαρμογή online παραγγελιών και κρατήσεων
            </p>
            <p>
              <strong>"Χρήστης":</strong> Κάθε φυσικό ή νομικό πρόσωπο που
              χρησιμοποιεί την πλατφόρμα
            </p>
            <p>
              <strong>"Παραγγελία":</strong> Η αίτηση αγοράς προϊόντων μέσω της
              πλατφόρμας
            </p>
            <p>
              <strong>"Κράτηση":</strong> Η προκράτηση τραπεζιού για
              συγκεκριμένη ημερομηνία και ώρα
            </p>
            <p>
              <strong>"Υπηρεσίες":</strong> Όλες οι λειτουργίες που παρέχονται
              μέσω της πλατφόρμας
            </p>
            <p>
              <strong>"Περιεχόμενο":</strong> Κείμενα, εικόνες, βίντεο και άλλο
              υλικό της πλατφόρμας
            </p>
          </div>
        </section>

        {/* Account Registration */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            2. Εγγραφή και Λογαριασμός Χρήστη
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                2.1 Δημιουργία Λογαριασμού
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Για να χρησιμοποιήσετε ορισμένες υπηρεσίες, πρέπει να
                  δημιουργήσετε λογαριασμό
                </li>
                <li>
                  Πρέπει να είστε τουλάχιστον 18 ετών για να δημιουργήσετε
                  λογαριασμό
                </li>
                <li>Πρέπει να παρέχετε ακριβείς και πλήρεις πληροφορίες</li>
                <li>
                  Είστε υπεύθυνοι για τη διατήρηση της εμπιστευτικότητας του
                  κωδικού σας
                </li>
                <li>
                  Είστε υπεύθυνοι για όλες τις δραστηριότητες που
                  πραγματοποιούνται μέσω του λογαριασμού σας
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                2.2 Ασφάλεια Λογαριασμού
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Δεν πρέπει να κοινοποιείτε τα στοιχεία σύνδεσής σας σε τρίτους
                </li>
                <li>
                  Πρέπει να μας ειδοποιήσετε άμεσα για οποιαδήποτε μη
                  εξουσιοδοτημένη χρήση
                </li>
                <li>
                  Διατηρούμε το δικαίωμα να αναστείλουμε ή να τερματίσουμε
                  λογαριασμούς που παραβιάζουν τους όρους
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Orders */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaShoppingCart className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              3. Παραγγελίες
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                3.1 Υποβολή Παραγγελίας
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Οι παραγγελίες υποβάλλονται μέσω της πλατφόρμας και υπόκεινται
                  σε επιβεβαίωση
                </li>
                <li>Η υποβολή παραγγελίας αποτελεί προσφορά αγοράς</li>
                <li>
                  Διατηρούμε το δικαίωμα να αποδεχθούμε ή να απορρίψουμε
                  παραγγελίες
                </li>
                <li>Θα λάβετε email επιβεβαίωσης μετά την επιτυχή υποβολή</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                3.2 Ελάχιστο Ποσό Παραγγελίας
              </h3>
              <p className="text-gray-700">
                Ενδέχεται να ισχύει ελάχιστο ποσό παραγγελίας ανάλογα με την
                περιοχή παράδοσης. Το ελάχιστο ποσό εμφανίζεται κατά τη
                διαδικασία παραγγελίας.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                3.3 Διαθεσιμότητα Προϊόντων
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Όλα τα προϊόντα υπόκεινται σε διαθεσιμότητα</li>
                <li>
                  Σε περίπτωση μη διαθεσιμότητας, θα επικοινωνήσουμε μαζί σας
                </li>
                <li>
                  Διατηρούμε το δικαίωμα να αντικαταστήσουμε προϊόντα με
                  παρόμοια (με τη συγκατάθεσή σας)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                3.4 Ακύρωση Παραγγελίας
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Μπορείτε να ακυρώσετε την παραγγελία πριν την έναρξη
                  παρασκευής
                </li>
                <li>Για ακύρωση, επικοινωνήστε άμεσα μαζί μας</li>
                <li>
                  Μετά την έναρξη παρασκευής, η ακύρωση ενδέχεται να μην είναι
                  δυνατή
                </li>
                <li>
                  Σε περίπτωση προπληρωμής, η επιστροφή χρημάτων θα γίνει εντός
                  5-7 εργάσιμων ημερών
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Reservations */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaCalendarCheck className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              4. Κρατήσεις
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                4.1 Πολιτική Κρατήσεων
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Οι κρατήσεις πρέπει να γίνονται τουλάχιστον 2 ώρες πριν την
                  επιθυμητή ώρα
                </li>
                <li>Η κράτηση επιβεβαιώνεται μέσω email ή τηλεφώνου</li>
                <li>
                  Το τραπέζι διατηρείται για 15 λεπτά μετά την ώρα κράτησης
                </li>
                <li>Σε περίπτωση καθυστέρησης, παρακαλούμε ενημερώστε μας</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                4.2 Ακύρωση Κράτησης
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Οι ακυρώσεις πρέπει να γίνονται τουλάχιστον 4 ώρες πριν την
                  ώρα κράτησης
                </li>
                <li>
                  Για ακύρωση, επικοινωνήστε μαζί μας τηλεφωνικά ή μέσω email
                </li>
                <li>
                  Επαναλαμβανόμενες ακυρώσεις χωρίς προειδοποίηση ενδέχεται να
                  οδηγήσουν σε περιορισμό κρατήσεων
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                4.3 Προκαταβολή
              </h3>
              <p className="text-gray-700">
                Για κρατήσεις μεγάλων ομάδων (άνω των 10 ατόμων) ενδέχεται να
                απαιτείται προκαταβολή. Η προκαταβολή επιστρέφεται σε περίπτωση
                έγκαιρης ακύρωσης.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing and Payment */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaMoneyBillWave className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              5. Τιμές και Πληρωμές
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                5.1 Τιμές
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Όλες οι τιμές εμφανίζονται σε Ευρώ (€) και περιλαμβάνουν ΦΠΑ
                </li>
                <li>Οι τιμές ενδέχεται να αλλάξουν χωρίς προειδοποίηση</li>
                <li>
                  Η τιμή που ισχύει είναι αυτή κατά τη στιγμή της παραγγελίας
                </li>
                <li>Τα έξοδα παράδοσης υπολογίζονται ανάλογα με την περιοχή</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                5.2 Μέθοδοι Πληρωμής
              </h3>
              <p className="text-gray-700 mb-2">
                Αποδεχόμαστε τις ακόλουθες μεθόδους πληρωμής:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Μετρητά κατά την παράδοση</li>
                <li>Πιστωτική/Χρεωστική κάρτα (online)</li>
                <li>PayPal (όπου διατίθεται)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                5.3 Ασφάλεια Πληρωμών
              </h3>
              <p className="text-gray-700">
                Όλες οι online πληρωμές επεξεργάζονται μέσω ασφαλών πυλών
                πληρωμών. Δεν αποθηκεύουμε στοιχεία πιστωτικών καρτών στους
                διακομιστές μας.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                5.4 Επιστροφές Χρημάτων
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  Οι επιστροφές χρημάτων γίνονται μόνο σε περίπτωση ακύρωσης από
                  εμάς
                </li>
                <li>
                  Η επιστροφή πραγματοποιείται με την ίδια μέθοδο πληρωμής
                </li>
                <li>
                  Ο χρόνος επιστροφής εξαρτάται από την τράπεζα (συνήθως 5-7
                  εργάσιμες ημέρες)
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            6. Παράδοση
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                6.1 Περιοχές Παράδοσης
              </h3>
              <p className="text-gray-700">
                Παραδίδουμε σε συγκεκριμένες περιοχές. Οι διαθέσιμες περιοχές
                εμφανίζονται κατά τη διαδικασία παραγγελίας.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                6.2 Χρόνοι Παράδοσης
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Οι εκτιμώμενοι χρόνοι παράδοσης είναι ενδεικτικοί</li>
                <li>
                  Ο χρόνος παράδοσης ενδέχεται να επηρεαστεί από εξωτερικούς
                  παράγοντες
                </li>
                <li>
                  Θα σας ενημερώσουμε σε περίπτωση σημαντικής καθυστέρησης
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                6.3 Παραλαβή Παραγγελίας
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Πρέπει να είστε διαθέσιμοι στη διεύθυνση παράδοσης</li>
                <li>Ελέγξτε την παραγγελία κατά την παραλαβή</li>
                <li>Αναφέρετε άμεσα τυχόν προβλήματα στον διανομέα</li>
              </ul>
            </div>
          </div>
        </section>

        {/* User Conduct */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaExclamationTriangle className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              7. Συμπεριφορά Χρήστη
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700">Συμφωνείτε να ΜΗΝ:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Χρησιμοποιείτε την πλατφόρμα για παράνομους σκοπούς</li>
              <li>Παραβιάζετε δικαιώματα πνευματικής ιδιοκτησίας</li>
              <li>Μεταδίδετε ιούς ή κακόβουλο λογισμικό</li>
              <li>Παρενοχλείτε ή απειλείτε άλλους χρήστες ή το προσωπικό</li>
              <li>Υποβάλλετε ψευδείς πληροφορίες</li>
              <li>
                Δημιουργείτε πολλαπλούς λογαριασμούς για κατάχρηση προσφορών
              </li>
              <li>
                Προσπαθείτε να αποκτήσετε μη εξουσιοδοτημένη πρόσβαση στο
                σύστημα
              </li>
            </ul>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            8. Πνευματική Ιδιοκτησία
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">
              Όλο το περιεχόμενο της πλατφόρμας (κείμενα, εικόνες, λογότυπα,
              γραφικά, κώδικας) προστατεύεται από δικαιώματα πνευματικής
              ιδιοκτησίας και ανήκει σε εμάς ή τους αδειοδότες μας.
            </p>
            <p className="text-gray-700">
              Δεν επιτρέπεται η αναπαραγωγή, διανομή, τροποποίηση ή εμπορική
              εκμετάλλευση του περιεχομένου χωρίς γραπτή άδεια.
            </p>
          </div>
        </section>

        {/* Liability */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaBalanceScale className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              9. Περιορισμός Ευθύνης
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700">
              Καταβάλλουμε κάθε προσπάθεια για την παροχή ποιοτικών υπηρεσιών,
              ωστόσο:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Δεν εγγυόμαστε αδιάλειπτη λειτουργία της πλατφόρμας</li>
              <li>
                Δεν ευθυνόμαστε για τεχνικά προβλήματα πέραν του ελέγχου μας
              </li>
              <li>Δεν ευθυνόμαστε για καθυστερήσεις λόγω ανωτέρας βίας</li>
              <li>
                Η ευθύνη μας περιορίζεται στο ποσό της συγκεκριμένης παραγγελίας
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              Σε περίπτωση προβλήματος, επικοινωνήστε μαζί μας άμεσα για
              επίλυση.
            </p>
          </div>
        </section>

        {/* Complaints */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            10. Παράπονα και Διαφορές
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">Για οποιοδήποτε παράπονο ή διαφορά:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Επικοινωνήστε μαζί μας εντός 24 ωρών από το περιστατικό</li>
              <li>
                Παρέχετε όλες τις απαραίτητες πληροφορίες (αριθμός παραγγελίας,
                φωτογραφίες κλπ.)
              </li>
              <li>Θα εξετάσουμε το αίτημά σας εντός 48 ωρών</li>
              <li>
                Θα προσπαθήσουμε να επιλύσουμε το πρόβλημα με φιλικό τρόπο
              </li>
            </ul>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            11. Τροποποίηση Όρων
          </h2>

          <p className="text-gray-700">
            Διατηρούμε το δικαίωμα να τροποποιήσουμε τους παρόντες όρους ανά
            πάσα στιγμή. Οι τροποποιήσεις τίθενται σε ισχύ από τη δημοσίευσή
            τους στην πλατφόρμα. Η συνεχής χρήση των υπηρεσιών μετά από
            τροποποιήσεις συνιστά αποδοχή των νέων όρων.
          </p>
        </section>

        {/* Applicable Law */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            12. Εφαρμοστέο Δίκαιο
          </h2>

          <p className="text-gray-700">
            Οι παρόντες όροι διέπονται από το ελληνικό δίκαιο. Για οποιαδήποτε
            διαφορά προκύψει, αρμόδια είναι τα δικαστήρια της Αθήνας.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-[#8B7355] rounded-2xl shadow-lg p-6 md:p-8 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            13. Επικοινωνία
          </h2>

          <p className="mb-4 text-gray-100">
            Για οποιαδήποτε ερώτηση σχετικά με τους Όρους Χρήσης, επικοινωνήστε
            μαζί μας:
          </p>
          <div className="space-y-2 text-gray-100">
            <p>
              <strong>Email:</strong>{" "}
              {settings?.contactInfo?.email || "info@example.com"}
            </p>
            <p>
              <strong>Τηλέφωνο:</strong>{" "}
              {settings?.contactInfo?.phone || "+30 210 123 4567"}
            </p>
            <p>
              <strong>Διεύθυνση:</strong>{" "}
              {settings?.contactInfo?.address?.street ||
                "Οδός Παραδείγματος 123"}
              , {settings?.contactInfo?.address?.postalCode || "12345"}{" "}
              {settings?.contactInfo?.address?.city || "Αθήνα"}
            </p>
            <p>
              <strong>Ωράριο Εξυπηρέτησης:</strong> Δευτέρα - Κυριακή, 10:00 -
              23:00
            </p>
          </div>
        </section>

        {/* Acceptance */}
        <section className="bg-gray-100 border-l-4 border-[#8B7355] rounded-lg p-6 mb-8">
          <p className="text-gray-800 font-semibold mb-2">Αποδοχή Όρων</p>
          <p className="text-gray-700">
            Με τη χρήση της πλατφόρμας μας, επιβεβαιώνετε ότι έχετε διαβάσει,
            κατανοήσει και αποδεχθεί πλήρως τους παρόντες Όρους Χρήσης καθώς και
            την Πολιτική Απορρήτου μας.
          </p>
        </section>

        {/* Back Button */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B7355] hover:bg-[#6B5745] text-white rounded-lg font-semibold transition-colors"
          >
            ← Επιστροφή στην Αρχική
          </a>
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
