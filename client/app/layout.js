import './globals.css';

export const metadata = { title: 'Storyline', description: 'A blog with comments' };
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
