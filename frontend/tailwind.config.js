export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0A1E23',
        aqua: '#00D2BE',
        mist: '#E6F0EE'
      },
      backgroundImage: {
        'dark-zen': 'radial-gradient(1200px 600px at 70% 20%, rgba(0,210,190,0.15), transparent), radial-gradient(900px 500px at 20% 80%, rgba(0,210,190,0.10), transparent)'
      },
      boxShadow: {
        glow: '0 0 40px rgba(0,210,190,0.25)'
      }
    }
  },
  plugins: []
}
