import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        mist: "#edf2f6",
        line: "#d7dee7",
        accent: "#0f8b8d",
        amber: "#d58a1f",
        plum: "#6b4e71"
      },
      boxShadow: {
        panel: "0 14px 40px rgba(22, 32, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;

