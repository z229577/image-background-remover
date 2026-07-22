import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Image Background Remover – Remove Background Free', description: 'Remove image backgrounds online in seconds and download a transparent PNG. No signup required.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
