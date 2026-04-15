import type { Metadata } from 'next';
import { Poppins, Source_Code_Pro } from 'next/font/google';
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
};

/** Root layout for the shell application. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${sourceCodePro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
