/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // basePath harus sama dengan nama repositori GitHub-mu
  basePath: '/presensi-siswa',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
};
export default nextConfig;
