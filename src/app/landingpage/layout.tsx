import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MyApp - Landing Page',
  description: 'Landing page modern dengan Next.js 14',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        {children}
      </body>
    </html>
  );
}