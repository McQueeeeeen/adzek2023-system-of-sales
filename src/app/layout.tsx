import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { ClientStoreProvider } from '@/components/providers/client-store-provider'
import { AppShell } from '@/components/layout/app-shell'

const manrope = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Adzek2023 — Система продаж',
  description: 'Операционная система продаж Adzek2023 для ведения касаний и сделок',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <ClientStoreProvider>
          <AppShell>{children}</AppShell>
        </ClientStoreProvider>
      </body>
    </html>
  )
}
