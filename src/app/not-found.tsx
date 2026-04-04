"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaHome,
  FaUtensils,
  FaCalendarAlt,
  FaPhone,
  FaArrowLeft,
} from "react-icons/fa";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full shadow-2xl mb-6">
            <FaUtensils className="text-white text-5xl" />
          </div>
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-4">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
          Ωχ! Αυτή η σελίδα δεν βρέθηκε
        </h2>
        <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
          Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί. Ας σας βοηθήσουμε
          να βρείτε αυτό που ψάχνετε!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
          >
            <FaArrowLeft />
            Επιστροφή
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
          >
            <FaHome />
            Αρχική Σελίδα
          </Link>
        </div>

        {/* Quick Links */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <h3 className="text-xl font-bold text-slate-800 mb-6">
            Δημοφιλείς Σελίδες
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Menu Link */}
            <Link
              href="/menu"
              className="group p-4 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all transform hover:scale-105 border-2 border-amber-200 hover:border-amber-400"
            >
              <FaUtensils className="text-amber-600 text-3xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold text-slate-800 mb-1">Μενού</h4>
              <p className="text-sm text-slate-600">Δείτε τις επιλογές μας</p>
            </Link>

            {/* Reservations Link */}
            <Link
              href="/reservations"
              className="group p-4 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all transform hover:scale-105 border-2 border-amber-200 hover:border-amber-400"
            >
              <FaCalendarAlt className="text-amber-600 text-3xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold text-slate-800 mb-1">Κρατήσεις</h4>
              <p className="text-sm text-slate-600">Κλείστε τραπέζι</p>
            </Link>

            {/* Contact Link */}
            <Link
              href="/contact"
              className="group p-4 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all transform hover:scale-105 border-2 border-amber-200 hover:border-amber-400"
            >
              <FaPhone className="text-amber-600 text-3xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold text-slate-800 mb-1">Επικοινωνία</h4>
              <p className="text-sm text-slate-600">Επικοινωνήστε μαζί μας</p>
            </Link>
          </div>
        </div>

        {/* Search Suggestion */}
        <p className="text-sm text-slate-500 mt-8">
          Αν νομίζετε ότι αυτό είναι λάθος, παρακαλούμε{" "}
          <Link
            href="/contact"
            className="text-amber-600 hover:text-amber-700 font-medium underline"
          >
            επικοινωνήστε μαζί μας
          </Link>
        </p>
      </div>
    </div>
  );
}
