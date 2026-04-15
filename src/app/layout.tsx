import type { Metadata, Viewport } from 'next';
import { Poppins, Source_Code_Pro } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const poppins = Poppins({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const sourceCodePro = Source_Code_Pro({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Rob Scholey',
  description: 'Software Engineer',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Rob Scholey',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Rob Scholey',
    description: 'Software Engineer',
    type: 'website',
  },
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#006546',
};

/** Root layout for the shell application. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${sourceCodePro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
