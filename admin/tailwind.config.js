/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#07c160',
        'primary-dark': '#059048',
      },
    },
  },
  plugins: [],
  // 避免与 MUI 样式冲突
  corePlugins: {
    preflight: false,
  },
};
