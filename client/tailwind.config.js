/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'safety-orange': '#FF6700',
                'industrial-grey': '#2C3E50',
                'light-grey': '#ECF0F1',
            },
        },
    },
    plugins: [],
}
