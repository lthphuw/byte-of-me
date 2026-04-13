import { cn } from '@/shared/lib/utils';

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
  ExternalLink,
  File,
  FileText,
  FileUser,
  Fingerprint,
  FolderCog,
  FolderSearch,
  Frown,
  HelpCircle,
  Image,
  Languages,
  Laptop,
  Loader2,
  type LucideProps,
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
  User,
  X,
} from 'lucide-react';

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
  email: Mail,
  check: Check,
  i18n: Languages,
  externalLink: ExternalLink,
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
  folderSearch: FolderSearch,
  game: Swords,
  music: AudioLines,
  exercise: Dumbbell,
  coding: Code,
  chat: FileUser,
  file: FileText,
  component: Component,
  sparkles: Sparkles,
  linkedin: (props: LucideProps) => (
    <RemoteSVG src="/icons/linkedin.svg" {...props} />
  ),
  github: (props: LucideProps) => (
    <RemoteSVG src="/icons/github.svg" {...props} />
  ),
};
interface CustomIconProps extends LucideProps {
  src: string;
}

const RemoteSVG = ({
  src,
  size = 24,
  className,
  ref,
  absoluteStrokeWidth,
  strokeWidth,
  color,
  ...props
}: CustomIconProps) => (
  <div
    className={cn('bg-current shrink-0', className)}
    style={{
      width: size,
      height: size,
      maskImage: `url(${src})`,
      WebkitMaskImage: `url(${src})`,
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
    }}
  />
);
