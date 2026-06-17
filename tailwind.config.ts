import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111318",
          800: "#242936",
          700: "#343b4c",
        },
        paper: {
          50: "#fbfaf7",
          100: "#f3f0e8",
        },
        signal: {
          500: "#2f8f83",
          600: "#24756d",
        },
        ember: {
          500: "#b7791f",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(17, 19, 24, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

