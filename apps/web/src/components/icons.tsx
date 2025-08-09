import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Bug,
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Component,
  Contact,
  Copy,
  CreditCard,
  Dumbbell,
  Facebook,
  File,
  FileText,
  FileUser,
  Fingerprint,
  FolderCog,
  FolderSearch,
  Frown,
  Github,
  HelpCircle,
  Image,
  Languages,
  Laptop,
  Linkedin,
  Loader2,
  LucideProps,
  Mail,
  Moon,
  MoreVertical,
  Newspaper,
  Pizza,
  Plus,
  Settings,
  Sparkles,
  SunMedium,
  Swords,
  Trash,
  Twitter,
  User,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export const Icons = {
  logo: Fingerprint,
  close: X,
  spinner: Loader2,
  sad: Frown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  post: FileText,
  page: File,
  project: FolderCog,
  contact: Contact,
  media: Image,
  settings: Settings,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  user: User,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  help: HelpCircle,
  pizza: Pizza,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  email: Mail,
  check: Check,
  i18n: Languages,
  toc: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'lucide lucide-table-of-contents-icon lucide-table-of-contents',
        className
      )}
      {...props}
    >
      <path d="M16 12H3" />
      <path d="M16 18H3" />
      <path d="M16 6H3" />
      <path d="M21 12h.01" />
      <path d="M21 18h.01" />
      <path d="M21 6h.01" />
    </svg>
  ),
  report: Bug,
  copy: Copy,
  debug: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-bug-play-icon lucide-bug-play', className)}
      {...props}
    >
      <path d="M12.765 21.522a.5.5 0 0 1-.765-.424v-8.196a.5.5 0 0 1 .765-.424l5.878 3.674a1 1 0 0 1 0 1.696z" />
      <path d="M14.12 3.88 16 2" />
      <path d="M18 11a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v3a6.1 6.1 0 0 0 2 4.5" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M6 13H2" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="m8 2 1.88 1.88" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
    </svg>
  ),
  article: Newspaper,
  scanSearch: ({ className, ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'lucide lucide-scan-search-icon lucide-scan-search',
        className
      )}
      {...props}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
      <path d="m16 16-1.9-1.9" />
    </svg>
  ),
  folderSearch: FolderSearch,
  game: Swords,
  music: AudioLines,
  exercise: Dumbbell,
  coding: Code,
  chat: FileUser,
  file: FileText,
  component: Component,
  sparkles: Sparkles,
};
