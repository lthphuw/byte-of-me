'use client';

import type React from 'react';
import { useCallback, useRef, useState, type ReactNode } from 'react';

interface LiquidGlassProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    variant?: 'button' | 'button-icon' | 'card' | 'panel' | 'floating';
    intensity?: 'subtle' | 'medium' | 'strong';
    disableRipple?: boolean;
    disableJiggle?: boolean;
    disableStretch?: boolean;
    disableHoverCursor?: boolean;
    disablePress?: boolean;
    onClick?: () => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    disabled?: boolean;
}

export function LiquidGlass({
    children,
    className = '',
    style,
    variant = 'card',
    intensity = 'medium',
    disableRipple = false,
    disableJiggle = false,
    disableStretch = false,
    disableHoverCursor = false,
    disablePress = false,
    onClick,
    onDragStart,
    onDragEnd,
    disabled,
}: LiquidGlassProps) {
    const [isJiggling, setIsJiggling] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [wobbleOffset, setWobbleOffset] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const elementRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const rippleCounter = useRef(0);

    const setIsJigglingWrapper = useCallback(
        (flag: boolean) => {
            if (!disableJiggle) {
                setIsJiggling(flag);
            }
        },
        [disableJiggle]
    );

    const setIsPressedWrapper = useCallback(
        (flag: boolean) => {
            if (!disablePress) {
                setIsPressed(flag);
            }
        },
        [disablePress]
    );

    const setIsDraggingWrapper = useCallback(
        (flag: boolean) => {
            if (!disableStretch) {
                setIsDragging(flag);
            }
        },
        [disableStretch]
    );

    const setIsHoveringWrapper = useCallback(
        (flag: boolean) => {
            if (!disableHoverCursor) {
                setIsHovering(flag);
            }
        },
        [disableHoverCursor]
    );

    const createRippleWrapper = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (disableRipple || !elementRef.current) {
                return;
            }

            const rect = elementRef.current.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const newRipple = {
                id: rippleCounter.current++,
                x,
                y,
            };

            setRipples((prev) => [...prev, newRipple]);

            setTimeout(() => {
                setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
            }, 600);
        },
        [disableRipple]
    );

    const getVariantClasses = () => {
        const baseClasses = `${!disabled && 'liquid-glass'} relative overflow-hidden`;

        switch (variant) {
            case 'button':
                return `${baseClasses} rounded-md select-none`;
            case 'button-icon':
                return `${baseClasses} rounded-full select-none`;
            case 'card':
                return `${baseClasses} p-6 rounded-3xl`;
            case 'panel':
                return `${baseClasses} rounded-2xl`;
            case 'floating':
                return `${baseClasses} p-4 rounded-full shadow-2xl`;
            default:
                return baseClasses;
        }
    };

    const getIntensityClasses = () => {
        switch (intensity) {
            case 'subtle':
                return 'backdrop-blur-sm bg-white/5 border-white/10';
            case 'strong':
                return 'backdrop-blur-3xl bg-white/20 border-white/30';
            default:
                return 'backdrop-blur-xl bg-white/10 border-white/20';
        }
    };

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!disableStretch) {
                setIsDraggingWrapper(true);
                dragStartPos.current = { x: e.clientX, y: e.clientY };
                onDragStart?.();
            } else if (variant === 'button') {
                setIsPressedWrapper(true);
            }

            createRippleWrapper(e);
        },
        [disableStretch, onDragStart, createRippleWrapper, variant, setIsDraggingWrapper, setIsPressedWrapper]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                setCursorPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }

            if (!isDragging) {
                return;
            }

            const deltaX = e.clientX - dragStartPos.current.x;
            const deltaY = e.clientY - dragStartPos.current.y;

            setDragOffset({ x: deltaX * 0.1, y: deltaY * 0.1 });
        },
        [isDragging]
    );

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDraggingWrapper(false);

            const currentOffset = { ...dragOffset };
            setWobbleOffset(currentOffset);

            setDragOffset({ x: 0, y: 0 });
            onDragEnd?.();

            setIsJigglingWrapper(true);
            setTimeout(() => {
                setIsJigglingWrapper(false);
                setWobbleOffset({ x: 0, y: 0 });
            }, 1800);
        } else if (variant === 'button' && isPressed) {
            setIsPressedWrapper(false);
            setWobbleOffset({ x: 0, y: 0 });
            setIsJigglingWrapper(true);
            setTimeout(() => setIsJigglingWrapper(false), 1800);
        }
    }, [isDragging, dragOffset, onDragEnd, variant, isPressed, setIsDraggingWrapper, setIsPressedWrapper, setIsJigglingWrapper]);

    const handleMouseEnter = useCallback(() => {
        setIsHoveringWrapper(true);
    }, [setIsHoveringWrapper]);

    const handleMouseLeave = useCallback(() => {
        setIsHoveringWrapper(false);
        setIsPressedWrapper(false);
        handleMouseUp();
    }, [setIsHoveringWrapper, setIsPressedWrapper]);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            createRippleWrapper(e);
            onClick?.();
        },
        [onClick, createRippleWrapper]
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            const touch = e.touches[0];
            if (!disableStretch) {
                setIsDraggingWrapper(true);
                dragStartPos.current = { x: touch.clientX, y: touch.clientY };
                onDragStart?.();
            } else if (variant === 'button') {
                setIsPressedWrapper(true);
            }

            createRippleWrapper(e);
        },
        [disableStretch, onDragStart, createRippleWrapper, variant, setIsDraggingWrapper, setIsPressedWrapper]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            const touch = e.touches[0];

            if (elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                setCursorPos({
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                });
            }

            if (!isDragging) {
                return;
            }

            e.preventDefault();

            const deltaX = touch.clientX - dragStartPos.current.x;
            const deltaY = touch.clientY - dragStartPos.current.y;

            setDragOffset({ x: deltaX * 0.1, y: deltaY * 0.1 });
        },
        [isDragging]
    );

    const handleTouchEnd = useCallback(() => {
        if (isDragging) {
            setIsDraggingWrapper(false);

            const currentOffset = { ...dragOffset };
            setWobbleOffset(currentOffset);

            setDragOffset({ x: 0, y: 0 });
            onDragEnd?.();

            setIsJigglingWrapper(true);
            setTimeout(() => {
                setIsJigglingWrapper(false);
                setWobbleOffset({ x: 0, y: 0 });
            }, 1800);
        } else if (variant === 'button' && isPressed) {
            setIsPressedWrapper(false);
            setWobbleOffset({ x: 0, y: 0 });
            setIsJigglingWrapper(true);
            setTimeout(() => setIsJigglingWrapper(false), 1800);
        }
    }, [isDragging, dragOffset, onDragEnd, variant, isPressed, setIsDraggingWrapper, setIsPressedWrapper, setIsJigglingWrapper]);

    const transformStyle = isJiggling
        ? ({
            '--wobble-start-x': `${wobbleOffset.x}px`,
            '--wobble-start-y': `${wobbleOffset.y}px`,
        } as React.CSSProperties)
        : {
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) ${isDragging ? 'scale(1.02)' : ''}`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
        };

    return (
        <div
            ref={elementRef}
            className={`
                ${getVariantClasses()}
                ${!disabled ? getIntensityClasses() : ''}
                ${!disabled && isJiggling && variant === 'button' ? 'liquid-wobble-active' : ''}
                ${!disabled && isPressed && variant === 'button' ? 'liquid-pressed' : ''}
                ${className}
            `}
            style={{
                ...transformStyle,
                ...style,
            }}
            onMouseDown={disabled ? undefined : handleMouseDown}
            onMouseMove={disabled ? undefined : handleMouseMove}
            onMouseUp={disabled ? undefined : handleMouseUp}
            onMouseLeave={disabled ? undefined : handleMouseLeave}
            onMouseEnter={disabled ? undefined : handleMouseEnter}
            onClick={disabled ? undefined : handleClick}
            onTouchStart={disabled ? undefined : handleTouchStart}
            onTouchMove={disabled ? undefined : handleTouchMove}
            onTouchEnd={disabled ? undefined : handleTouchEnd}
            onTouchCancel={disabled ? undefined : handleTouchEnd}
        >
            {!disabled && !disableHoverCursor && isHovering && (
                <div
                    className="pointer-events-none absolute"
                    style={{
                        left: cursorPos.x,
                        top: cursorPos.y,
                        width: '80px',
                        height: '80px',
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        filter: 'blur(10px)',
                        zIndex: 2,
                    }}
                />
            )}

            {!disabled &&
                !disableRipple &&
                ripples.map((ripple) => (
                    <div
                        key={ripple.id}
                        className="pointer-events-none absolute"
                        style={{
                            left: ripple.x,
                            top: ripple.y,
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.4)',
                            transform: 'translate(-50%, -50%)',
                            animation: 'liquidRipple 0.6s ease-out forwards',
                        }}
                    />
                ))}

            <div className="relative z-10 h-full w-full">{children}</div>

            {!disabled && (
                <div className="z-5 pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
            )}
        </div>
    );
}