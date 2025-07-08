import { ReactNode } from 'react';


import '@/styles/globals.css';
import '../../node_modules/flag-icons/css/flag-icons.min.css';

type Props = {
  children: ReactNode;
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Props) {
  return children;
}
