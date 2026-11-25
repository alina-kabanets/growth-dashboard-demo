import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";

// The dashboard on its own page under the disclaimer. No app navigation, by design.
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div role="note" className="bg-zinc-750 px-4 py-2 text-center text-xs font-medium text-white">
        {BRAND.disclaimer} Rebuilt from scratch by Alina Kabanets from her own designs.
      </div>
      <main>{children}</main>
    </div>
  );
}
