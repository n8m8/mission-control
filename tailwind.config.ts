import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Catppuccin Mocha
        'mc-bg': '#1e1e2e',           // Base
        'mc-bg-secondary': '#181825', // Mantle
        'mc-bg-tertiary': '#313244',  // Surface0
        'mc-border': '#45475a',       // Surface1
        'mc-text': '#cdd6f4',         // Text
        'mc-text-secondary': '#a6adc8', // Subtext0
        'mc-accent': '#89b4fa',       // Blue
        'mc-accent-green': '#a6e3a1', // Green
        'mc-accent-yellow': '#f9e2af', // Yellow
        'mc-accent-red': '#f38ba8',   // Red
        'mc-accent-purple': '#cba6f7', // Mauve
        'mc-accent-pink': '#f5c2e7',  // Pink
        'mc-accent-cyan': '#94e2d5',  // Teal
        'mc-accent-peach': '#fab387', // Peach
        'mc-accent-lavender': '#b4befe', // Lavender
        'mc-accent-sky': '#89dceb',   // Sky
        'mc-accent-sapphire': '#74c7ec', // Sapphire
        'mc-accent-flamingo': '#f2cdcd', // Flamingo
        'mc-accent-rosewater': '#f5e0dc', // Rosewater
        'mc-accent-maroon': '#eba0ac', // Maroon
        // Surface variants
        'mc-surface0': '#313244',
        'mc-surface1': '#45475a',
        'mc-surface2': '#585b70',
        'mc-overlay0': '#6c7086',
        'mc-overlay1': '#7f849c',
        'mc-overlay2': '#9399b2',
        'mc-crust': '#11111b',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
