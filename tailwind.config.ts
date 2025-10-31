import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '320px',  // Mobile
        'sm': '640px',  // Small tablets
        'md': '768px',  // Tablets
        'lg': '1024px', // Desktop
        'xl': '1280px', // Large desktop
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};

export default config;
