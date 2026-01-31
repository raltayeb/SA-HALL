import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SA Hall | منصة حجز القاعات السعودية',
  description: 'منصة SaaS سعودية لحجز قاعات الأفراح والمناسبات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-foreground antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}