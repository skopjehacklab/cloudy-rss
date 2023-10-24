import type { Config } from 'tailwindcss'

import * as colors from 'tailwindcss/colors'

const config = {
  // 2. Opt for dark mode to be handled via the class method
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}',
    '../../node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
  ],

  plugins: [
    require('flowbite/plugin'),
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar')
  ],
  theme: {
    extend: {
      colors: {
        // flowbite-svelte
        primary: {
          50: '#FFF5F2',
          100: '#FFF1EE',
          200: '#FFE4DE',
          300: '#FFD5CC',
          400: '#FFBCAD',
          500: '#FE795D',
          600: '#EF562F',
          700: '#EB4F27',
          800: '#CC4522',
          900: '#A5371B'
        },
        gray: colors.stone
      }
    }
  }
} satisfies Config

export default config

module.exports = config
