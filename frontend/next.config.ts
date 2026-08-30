import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silences Turbopack's workspace-root guess: the repo root has its own
  // package.json/lockfile too (for the unrelated Railway IaC tooling in
  // .railway/), which Turbopack otherwise mistakes for a monorepo root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
