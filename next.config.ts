import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Rewrite barrel imports (e.g. `import { Plus } from "lucide-react"`) to deep
  // imports so dev only compiles the icons/components a route actually uses,
  // not the whole package. lucide-react is in ~105 files here.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@base-ui/react",
    ],
  },
};

export default withNextIntl(nextConfig);
