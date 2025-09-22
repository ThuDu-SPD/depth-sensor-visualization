/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',   // A nice blue
        secondary: '#10B981', // A modern green
        accent: '#8B5CF6',    // A subtle purple
        background: '#F9FAFB',
        text: '#1F2937'
      }
    },
  },
  plugins: [],
}