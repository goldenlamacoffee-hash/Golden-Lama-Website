import type { Metadata } from "next"
import { Suspense } from "react"
import { SiteUnlockForm } from "@/components/site-unlock-form"

export const metadata: Metadata = {
  title: "Golden Lama Coffee",
  robots: { index: false, follow: false },
}

export default function SiteUnlockPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#28170F] px-4 py-12">
      <Suspense>
        <SiteUnlockForm />
      </Suspense>
    </main>
  )
}
