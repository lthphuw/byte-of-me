import './globals.css';
import '../../node_modules/flag-icons/css/flag-icons.min.css';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return children;
}
