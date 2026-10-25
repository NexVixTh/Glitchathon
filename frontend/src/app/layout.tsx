import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'SyncUp AI | Semester Copilot',
  description: 'Burnout-aware semester copilot with adaptive study pacing, risk triage, and active recall.',
};

export const viewport: Viewport = {
  themeColor: '#090A0F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#090A0F] text-neutral-100 antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
