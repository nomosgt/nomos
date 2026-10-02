import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    // Marca única: todo o tráfego do domínio antigo cai no archebrasil.com.br
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "nomosgt.com.br" }],
        destination: "https://www.archebrasil.com.br/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.nomosgt.com.br" }],
        destination: "https://www.archebrasil.com.br/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
