import './globals.css';

export const metadata = {
  title: 'MicFlow',
  description: 'Draadloze microfoon planning voor events',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}