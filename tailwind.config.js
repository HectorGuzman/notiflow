module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta alineada al logo de Notiflow
        primary: '#F7A800',      // naranja principal
        'primary-dark': '#D98500',
        secondary: '#0D1321',    // azul noche para textos/headers
        accent: '#E5251F',       // rojo acento puntual
        light: '#FDF7EC',        // fondo cálido claro
        muted: '#8A8F9C',        // textos secundarios
      },
      fontFamily: {
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
