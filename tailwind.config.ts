import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      fontFamily: {
        sans: ["'Gill Sans MT Pro'", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
        'slideUp': 'slideInUp 0.4s ease-out forwards',
        'slideDown': 'slideInDown 0.4s ease-out forwards',
        'slideInRight': 'slideInRight 0.4s ease-out forwards',
        'scaleIn': 'scaleIn 0.3s ease-out forwards',
        'bounceIn': 'bounceIn 0.5s ease-out forwards',
      },
    },
  },
  variants: {
    extend: {
      display: ["print"], // Προσθήκη υποστήριξης για `print` variant
    },
  },
  plugins: [],
} satisfies Config;
