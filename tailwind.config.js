/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./screens/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                poppins: ['Poppins', 'sans-serif'],
            },
            colors: {
                purple: '#8B5CF6',
                pink: '#EC4899',
                cyan: '#06B6D4',
                orange: '#F59E0B',
                dark: {
                    800: '#1E293B',
                    900: '#0F172A',
                    950: '#020617', // Deep Void
                },
                light: {
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                    800: '#CBD5E1',
                    900: '#0F172A', // Text color for light mode
                }
            },
            backgroundImage: {
                'gradient-aurora': 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 50%, #EC4899 100%)',
                'gradient-surface-dark': 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                'gradient-surface-light': 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(139, 92, 246, 0.5)',
                'soft': '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'shimmer': 'shimmer 2s infinite linear',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                }
            }
        }
    },
    plugins: [],
}
