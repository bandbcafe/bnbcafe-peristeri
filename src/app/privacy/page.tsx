"use client";

import React from "react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import {
  FaShieldAlt,
  FaLock,
  FaCookie,
  FaUserShield,
  FaEnvelope,
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

export default function PrivacyPolicyPage() {
  const { websiteSettings: settings } = useWebsiteSettings();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaShieldAlt className="text-4xl" />
            <h1 className="text-3xl md:text-5xl font-bold">
              Πολιτική Απορρήτου
            </h1>
          </div>
          <p className="text-center text-gray-200 text-lg max-w-2xl mx-auto">
            Η προστασία των προσωπικών σας δεδομένων είναι προτεραιότητά μας
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
            <FaUserShield className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Εισαγωγή
            </h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            Η παρούσα Πολιτική Απορρήτου περιγράφει τον τρόπο με τον οποίο
            συλλέγουμε, χρησιμοποιούμε, αποθηκεύουμε και προστατεύουμε τα
            προσωπικά σας δεδομένα όταν χρησιμοποιείτε την ιστοσελίδα μας για
            online παραγγελίες και κρατήσεις.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Δεσμευόμαστε να σεβόμαστε την ιδιωτικότητά σας και να
            συμμορφωνόμαστε πλήρως με τον Γενικό Κανονισμό Προστασίας Δεδομένων
            (GDPR) και την ελληνική νομοθεσία περί προστασίας προσωπικών
            δεδομένων.
          </p>
        </section>

        {/* Data Collection */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            1. Συλλογή Προσωπικών Δεδομένων
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                1.1 Δεδομένα που Συλλέγουμε
              </h3>
              <p className="text-gray-700 mb-3">
                Συλλέγουμε τα ακόλουθα προσωπικά δεδομένα:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  <strong>Στοιχεία Ταυτοποίησης:</strong> Ονοματεπώνυμο, email,
                  τηλέφωνο
                </li>
                <li>
                  <strong>Στοιχεία Παράδοσης:</strong> Διεύθυνση, περιοχή,
                  οδηγίες παράδοσης
                </li>
                <li>
                  <strong>Στοιχεία Παραγγελίας:</strong> Προϊόντα, ποσότητες,
                  τιμές, προτιμήσεις
                </li>
                <li>
                  <strong>Στοιχεία Κράτησης:</strong> Ημερομηνία, ώρα, αριθμός
                  ατόμων, ειδικές απαιτήσεις
                </li>
                <li>
                  <strong>Στοιχεία Πληρωμής:</strong> Μέθοδος πληρωμής (δεν
                  αποθηκεύουμε στοιχεία καρτών)
                </li>
                <li>
                  <strong>Τεχνικά Δεδομένα:</strong> IP address, browser,
                  συσκευή, cookies
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#8B7355] mb-3">
                1.2 Τρόπος Συλλογής
              </h3>
              <p className="text-gray-700 mb-3">Τα δεδομένα συλλέγονται:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Κατά την εγγραφή σας στην πλατφόρμα</li>
                <li>Κατά την υποβολή παραγγελίας ή κράτησης</li>
                <li>Κατά την επικοινωνία μαζί μας</li>
                <li>Αυτόματα μέσω cookies και τεχνολογιών παρακολούθησης</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Usage */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            2. Χρήση Προσωπικών Δεδομένων
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">
              Χρησιμοποιούμε τα προσωπικά σας δεδομένα για τους ακόλουθους
              σκοπούς:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>
                <strong>Επεξεργασία Παραγγελιών:</strong> Για την εκτέλεση και
                παράδοση των παραγγελιών σας
              </li>
              <li>
                <strong>Διαχείριση Κρατήσεων:</strong> Για την επιβεβαίωση και
                διαχείριση των κρατήσεών σας
              </li>
              <li>
                <strong>Επικοινωνία:</strong> Για ενημερώσεις σχετικά με τις
                παραγγελίες/κρατήσεις σας
              </li>
              <li>
                <strong>Εξυπηρέτηση Πελατών:</strong> Για την παροχή υποστήρικης
                και απάντηση σε ερωτήσεις
              </li>
              <li>
                <strong>Βελτίωση Υπηρεσιών:</strong> Για την ανάλυση και
                βελτίωση των υπηρεσιών μας
              </li>
              <li>
                <strong>Ασφάλεια:</strong> Για την πρόληψη απάτης και την
                προστασία της πλατφόρμας
              </li>
              <li>
                <strong>Νομικές Υποχρεώσεις:</strong> Για τη συμμόρφωση με
                νομικές απαιτήσεις
              </li>
            </ul>
          </div>
        </section>

        {/* Data Protection */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaLock className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              3. Προστασία Δεδομένων
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700">
              Λαμβάνουμε όλα τα απαραίτητα τεχνικά και οργανωτικά μέτρα για την
              προστασία των προσωπικών σας δεδομένων:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>
                <strong>Κρυπτογράφηση:</strong> Χρήση SSL/TLS για ασφαλή
                μετάδοση δεδομένων
              </li>
              <li>
                <strong>Ασφαλής Αποθήκευση:</strong> Χρήση Firebase με προηγμένα
                μέτρα ασφαλείας
              </li>
              <li>
                <strong>Περιορισμένη Πρόσβαση:</strong> Μόνο εξουσιοδοτημένο
                προσωπικό έχει πρόσβαση
              </li>
              <li>
                <strong>Τακτικές Ενημερώσεις:</strong> Συνεχής ενημέρωση
                συστημάτων ασφαλείας
              </li>
              <li>
                <strong>Παρακολούθηση:</strong> Συνεχής έλεγχος για ύποπτες
                δραστηριότητες
              </li>
            </ul>
          </div>
        </section>

        {/* Cookies */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaCookie className="text-3xl text-[#8B7355]" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              4. Cookies και Τεχνολογίες Παρακολούθησης
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700">
              Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες για:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>
                <strong>Απαραίτητα Cookies:</strong> Για τη λειτουργία της
                ιστοσελίδας
              </li>
              <li>
                <strong>Cookies Προτιμήσεων:</strong> Για την αποθήκευση των
                ρυθμίσεών σας
              </li>
              <li>
                <strong>Cookies Ανάλυσης:</strong> Για τη βελτίωση της εμπειρίας
                χρήστη
              </li>
              <li>
                <strong>Session Storage:</strong> Για την προσωρινή αποθήκευση
                καλαθιού
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              Μπορείτε να διαχειριστείτε τις προτιμήσεις cookies μέσω των
              ρυθμίσεων του browser σας.
            </p>
          </div>
        </section>

        {/* Data Sharing */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            5. Κοινοποίηση Δεδομένων
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">
              Δεν πουλάμε ούτε ενοικιάζουμε τα προσωπικά σας δεδομένα. Ενδέχεται
              να κοινοποιήσουμε δεδομένα μόνο στις ακόλουθες περιπτώσεις:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>
                <strong>Πάροχοι Υπηρεσιών:</strong> Firebase (hosting), email
                providers (για ειδοποιήσεις)
              </li>
              <li>
                <strong>Νομικές Απαιτήσεις:</strong> Όταν απαιτείται από το νόμο
              </li>
              <li>
                <strong>Προστασία Δικαιωμάτων:</strong> Για την προστασία των
                δικαιωμάτων μας
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              Όλοι οι τρίτοι πάροχοι δεσμεύονται συμβατικά να προστατεύουν τα
              δεδομένα σας.
            </p>
          </div>
        </section>

        {/* User Rights */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            6. Τα Δικαιώματά Σας
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">
              Σύμφωνα με τον GDPR, έχετε τα ακόλουθα δικαιώματα:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>
                <strong>Δικαίωμα Πρόσβασης:</strong> Να ζητήσετε αντίγραφο των
                δεδομένων σας
              </li>
              <li>
                <strong>Δικαίωμα Διόρθωσης:</strong> Να διορθώσετε ανακριβή
                δεδομένα
              </li>
              <li>
                <strong>Δικαίωμα Διαγραφής:</strong> Να ζητήσετε τη διαγραφή των
                δεδομένων σας
              </li>
              <li>
                <strong>Δικαίωμα Περιορισμού:</strong> Να περιορίσετε την
                επεξεργασία
              </li>
              <li>
                <strong>Δικαίωμα Φορητότητας:</strong> Να λάβετε τα δεδομένα σε
                δομημένη μορφή
              </li>
              <li>
                <strong>Δικαίωμα Εναντίωσης:</strong> Να αντιταχθείτε στην
                επεξεργασία
              </li>
              <li>
                <strong>Ανάκληση Συγκατάθεσης:</strong> Να ανακαλέσετε τη
                συγκατάθεσή σας ανά πάσα στιγμή
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              Για να ασκήσετε οποιοδήποτε από τα παραπάνω δικαιώματα,
              επικοινωνήστε μαζί μας.
            </p>
          </div>
        </section>

        {/* Data Retention */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            7. Διατήρηση Δεδομένων
          </h2>

          <div className="space-y-4">
            <p className="text-gray-700">
              Διατηρούμε τα προσωπικά σας δεδομένα για όσο χρονικό διάστημα
              είναι απαραίτητο:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>
                <strong>Δεδομένα Λογαριασμού:</strong> Όσο ο λογαριασμός σας
                είναι ενεργός
              </li>
              <li>
                <strong>Ιστορικό Παραγγελιών:</strong> 5 χρόνια (φορολογικές
                υποχρεώσεις)
              </li>
              <li>
                <strong>Δεδομένα Επικοινωνίας:</strong> 2 χρόνια από την
                τελευταία επικοινωνία
              </li>
              <li>
                <strong>Cookies:</strong> Σύμφωνα με τις ρυθμίσεις του browser
                σας
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              Μετά τη λήξη της περιόδου διατήρησης, τα δεδομένα διαγράφονται με
              ασφαλή τρόπο.
            </p>
          </div>
        </section>

        {/* Children Privacy */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            8. Προστασία Ανηλίκων
          </h2>

          <p className="text-gray-700">
            Οι υπηρεσίες μας απευθύνονται σε άτομα άνω των 18 ετών. Δεν
            συλλέγουμε εν γνώσει μας προσωπικά δεδομένα από ανήλικους. Εάν
            διαπιστώσουμε ότι έχουμε συλλέξει δεδομένα από ανήλικο, θα τα
            διαγράψουμε άμεσα.
          </p>
        </section>

        {/* Changes */}
        <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
            9. Αλλαγές στην Πολιτική Απορρήτου
          </h2>

          <p className="text-gray-700">
            Ενδέχεται να ενημερώσουμε την παρούσα Πολιτική Απορρήτου περιοδικά.
            Θα σας ενημερώσουμε για τυχόν σημαντικές αλλαγές μέσω email ή
            ειδοποίησης στην ιστοσελίδα. Η συνεχής χρήση των υπηρεσιών μας μετά
            από αλλαγές συνιστά αποδοχή της νέας πολιτικής.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-[#8B7355] rounded-2xl shadow-lg p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <FaEnvelope className="text-3xl" />
            <h2 className="text-2xl md:text-3xl font-bold">10. Επικοινωνία</h2>
          </div>

          <p className="mb-4 text-gray-100">
            Για οποιαδήποτε ερώτηση ή αίτημα σχετικά με την Πολιτική Απορρήτου ή
            τα προσωπικά σας δεδομένα, μπορείτε να επικοινωνήσετε μαζί μας:
          </p>
          <div className="space-y-2 text-gray-100">
            <p>
              <strong>Email:</strong>{" "}
              {settings?.contactInfo?.email || "privacy@example.com"}
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
          </div>
          <p className="mt-6 text-gray-200 text-sm">
            Θα απαντήσουμε στο αίτημά σας εντός 30 ημερών σύμφωνα με τον GDPR.
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
