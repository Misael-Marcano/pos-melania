import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import { Providers } from './providers';
import { appBrand } from '@/lib/app-brand';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title:       appBrand.title,
  description: appBrand.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
