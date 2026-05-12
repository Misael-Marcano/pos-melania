/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Editorial Intelligence — deep olive primary
        primary: {
          DEFAULT: '#3D4E3D',
          50:  '#f0f5f0',
          100: '#d4e8d1',
          200: '#b8ccb6',  // inverse_primary — accent on dark bg
          300: '#8aab85',
          400: '#5a7050',
          500: '#3D4E3D',  // primary_container
          600: '#273727',  // primary (darkest)
          700: '#1f2c1f',
          800: '#141e14',
          900: '#0a120a',
        },
        // Surface / neutral scale
        navy: {
          DEFAULT: '#3D4E3D',
          50:  '#F1F4F3',   // surface_container_low
          100: '#F7FAF9',   // surface — main app background
          200: '#E0E3E2',   // surface_variant / ghost border
          300: '#c4c8c0',   // outline_variant
          400: '#747871',   // outline / secondary text
          500: '#434842',   // on_surface_variant
          600: '#3D4E3D',   // primary_container
          700: '#3D4E3D',   // sidebar background
          800: '#181C1C',   // on_surface — main text
          900: '#0f1213',
          950: '#070b07',
        },
        // Functional accent
        secondary: {
          DEFAULT: '#0060AC',
          light: '#68abff',
          container: '#d4e3ff',
        },
        /** Placeholder-style copy on empty native select triggers */
        muted: {
          DEFAULT: '#F1F4F3',
          foreground: '#747871',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'Manrope', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        // Editorial Intelligence — ambient diffusion (Stitch reference)
        'card':        '0 4px 40px 0 rgb(24 28 28 / 0.05)',
        'card-hover':  '0 8px 48px 0 rgb(24 28 28 / 0.08)',
        'sidebar':     '2px 0 24px 0 rgb(0 0 0 / 0.12)',
        'ambient':     '0 4px 40px 0 rgb(24 28 28 / 0.05)',
        'float':       '0 12px 48px 0 rgb(24 28 28 / 0.10)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
};
