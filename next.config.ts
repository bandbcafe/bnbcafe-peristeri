/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true, // Ενεργοποιεί το React Strict Mode για debugging
  images: {
    domains: ["sweetleaf.gr"], // Επιτρέπει φόρτωση εικόνων από το sweetleaf.gr
    unoptimized: true, // Απενεργοποίηση του Image Optimization για υποστήριξη Electron
  },
  output: "standalone", // Επιτρέπει τη δημιουργία standalone εφαρμογής για χρήση με Electron
  eslint: {
    ignoreDuringBuilds: true, // Απενεργοποιεί τον έλεγχο ESLint κατά το build (προαιρετικό)
  },
  };

module.exports = config;
