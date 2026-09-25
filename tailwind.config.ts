import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sonar: {
          50: '#f0f4ff',
          100: '#d9e2ff',
          400: '#637bfe',
          500: '#4355f7',
          600: '#2b36e8',
          900: '#0c1033',
          950: '#07091d',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'bg-float': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(var(--float-x, 8px), var(--float-y, -8px))' },
        },
      },
      animation: {
        'bg-float': 'bg-float 12s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
