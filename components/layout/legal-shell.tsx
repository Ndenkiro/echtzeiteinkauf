// components/layout/legal-shell.tsx
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export function LegalShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="bg-[#0A0A0A] pt-32 pb-14 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block bg-orange text-black text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wide mb-4">
              {eyebrow}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{title}</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-14 prose-legal">
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
