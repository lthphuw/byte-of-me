'use client';

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
} from 'lucide-react';

import { useMediaQuery } from '../../../hooks/use-media-query';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger
} from '../../../index';

import { MobileToolbarGroup, MobileToolbarItem } from './mobile-toolbar-group';
import { useToolbar } from './toolbar-provider';

export const AlignmentTooolbar = () => {
  const { editor, state } = useToolbar();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const handleAlign = (value: string) => {
    editor?.chain().focus().setTextAlign(value).run();
  };

  const isDisabled = state.imageSelected;
  const currentTextAlign = state.textAlign;

  const alignmentOptions = [
    {
      name: 'Left Align',
      value: 'left',
      icon: <AlignLeft className="h-4 w-4" />,
    },
    {
      name: 'Center Align',
      value: 'center',
      icon: <AlignCenter className="h-4 w-4" />,
    },
    {
      name: 'Right Align',
      value: 'right',
      icon: <AlignRight className="h-4 w-4" />,
    },
    {
      name: 'Justify Align',
      value: 'justify',
      icon: <AlignJustify className="h-4 w-4" />,
    },
  ];

  const findIndex = (value: string) => {
    return alignmentOptions.findIndex((option) => option.value === value);
  };

  if (isMobile) {
    return (
      <MobileToolbarGroup
        label={
          alignmentOptions[findIndex(currentTextAlign)]?.name ?? 'Left Align'
        }
      >
        {alignmentOptions.map((option, index) => (
          <MobileToolbarItem
            key={index}
            onClick={() => handleAlign(option.value)}
            active={currentTextAlign === option.value}
          >
            <span className="mr-2">{option.icon}</span>
            {option.name}
          </MobileToolbarItem>
        ))}
      </MobileToolbarGroup>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger disabled={isDisabled} asChild>
            <Button variant="ghost" size="sm" className="h-8 w-max font-normal">
              <span className="mr-2">
                {alignmentOptions[findIndex(currentTextAlign)]?.icon}
              </span>
              {alignmentOptions[findIndex(currentTextAlign)]?.name}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Text Alignment</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        loop
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <DropdownMenuGroup className=" w-40">
          {alignmentOptions.map((option, index) => (
            <DropdownMenuItem
              onSelect={() => {
                handleAlign(option.value);
              }}
              key={index}
            >
              <span className="mr-2">{option.icon}</span>
              {option.name}

              {option.value === currentTextAlign && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
