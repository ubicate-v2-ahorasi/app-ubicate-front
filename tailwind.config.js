/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'selector',
  theme: {
    extend: {
      colors: {
        'custom-cyan': '#00979C',
      },
    },
  },
}
