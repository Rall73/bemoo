/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudinary/OpenAI usam APIs nativas do Node — não devem ser empacotadas pelo Next
  serverExternalPackages: ["cloudinary", "openai", "docx"],
  async headers() {
    return [
      {
        // Aplica a todas as rotas
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          // self = permite câmera/microfone na própria origem (necessário p/ foto e áudio)
          { key: "Permissions-Policy",         value: "camera=(self), microphone=(self), geolocation=()" },
          { key: "X-DNS-Prefetch-Control",     value: "on" },
        ],
      },
      {
        // Headers adicionais apenas para rotas de API
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ]
  },
}

export default nextConfig
