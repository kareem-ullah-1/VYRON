/** @type {import('next').NextConfig} */
const nextConfig = {
  // Public portfolio demo: there is no sign-in, so the old auth routes all lead to the dashboard.
  async redirects() {
    return [
      { source: '/login', destination: '/', permanent: false },
      { source: '/signup', destination: '/', permanent: false },
      { source: '/landing', destination: '/', permanent: false },
      { source: '/dashboard', destination: '/', permanent: false },
    ]
  },
}

module.exports = nextConfig
