import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SiteScope — SEO & GEO Audit Tool',
  description: 'Comprehensive SEO and Generative Engine Optimization audit for any website. Get ranked on Google and AI platforms.',
  keywords: ['SEO audit', 'GEO audit', 'AI search optimization', 'website analysis', 'site score'],
  openGraph: {
    title: 'SiteScope — SEO & GEO Audit Tool',
    description: 'Audit your website for Google and AI search visibility in seconds.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
