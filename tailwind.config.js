/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      fontFamily: {
        russo: ['"Russo One"', 'sans-serif'],
        manrope: ['"Manrope"', 'sans-serif'],
      },
      colors: {
        sparta: {
          black: '#050505',
          dark: '#0A0A0A',
          gold: '#D4AF37',
          'gold-light': '#FCD34D',
          'gold-dark': '#B45309',
          red: '#E50914',
        },
        primary: 'var(--theme-text-main)',
        secondary: 'var(--theme-text-soft)',
        surface: 'var(--theme-bg-main)',
        'surface-dark': 'var(--theme-bg-card)',
        'card-bg': 'var(--theme-bg-card)',
        'card-border': 'var(--theme-border-main)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FCD34D 0%, #D4AF37 50%, #B45309 100%)',
        'glass-dark': 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        'site-bg': "url('/site-bg.png')",
        'hero-bg': "url('/bg-hero.png')",
        'why-us-bg': "url('/bg-why-us.png')",
        'programs-bg': "url('/bg-programs.png')",
        'team-bg': "url('/bg-team.png')",
        'faq-bg': "url('/bg-faq.png')",
      }
    },
  },
  plugins: [],
}

