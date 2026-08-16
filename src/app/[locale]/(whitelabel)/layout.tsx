import type { ReactNode } from "react";

// Deliberately minimal — no Arioo header/nav/footer, since pages under this
// group are served on a partner's own custom domain (see src/proxy.ts) and
// must read as the partner's product, not Arioo's.
export default function WhitelabelLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
