import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Margin — A little more English, every day',
  description: 'A thoughtful home for reading, language and lasting understanding.',
  applicationName: 'Margin',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
