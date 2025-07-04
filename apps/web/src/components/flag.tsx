import { ComponentType } from 'react';
import { FlagType } from '@/types';

export type Flag = ComponentType<{ className?: string }>;
export const Flags: Record<FlagType, Flag> = {
  vi: (props) => <span className={`fi fi-vn ${props.className || ''} `} />,
  en: (props) => <span className={`fi fi-gb ${props.className || ''} `} />,
  fr: (props) => <span className={`fi fi-fr ${props.className || ''} `} />,
};
