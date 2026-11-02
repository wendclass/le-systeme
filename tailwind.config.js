/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Design system Class S v2.0
        'violet-imperial': '#6600CC',
        'or-champagne': '#C9A070',
        'amethyste': '#A87FE8',
        'ivoire-violet': '#F8F5FF',
        'ardoise': '#3A2F5C',
        'onyx': '#0D0A18',

        // États
        'success': '#2FA77A',
        'warning': '#C9A070',
        'error': '#E5484D',
        'info': '#A87FE8',

        // Rétrocompatibilité Fenêtre de Statut
        violetImperial: '#6600CC',
        champagne: '#C9A070',
        blancNacre: '#F8F5FF',
        negatif: '#E5484D',
        positif: '#2FA77A',
        cyanAura: '#5EC8D8',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['Jost', 'system-ui', 'sans-serif'],
        jost: ['Jost', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
        lg: '24px',
        md: '16px',
        sm: '12px',
        input: '12px',
        badge: '9999px',
        btn: '9999px',
        minicard: '16px',
        card: '24px',
        hero: '32px',
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(102, 0, 204, 0.08)',
        'soft-lg': '0 20px 40px -15px rgba(102, 0, 204, 0.12)',
        glow: '0 0 25px rgba(168, 127, 232, 0.35)',
        glass: '0 8px 32px rgba(13, 10, 24, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'hero-glow': '0 16px 48px rgba(102, 0, 204, 0.25), 0 0 80px rgba(168, 127, 232, 0.15)',
        'card-hover': '0 12px 40px rgba(13, 10, 24, 0.45), 0 0 20px rgba(168, 127, 232, 0.2)',
      },
      transitionTimingFunction: {
        'ease-out-class-s': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '300ms',
        slow: '600ms',
      },
    },
  },
  plugins: [],
}
