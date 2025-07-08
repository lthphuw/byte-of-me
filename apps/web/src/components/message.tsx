'use client';

export interface MessageProps {
    role: 'user' | 'assistant';
    content: string;
}

export function Message({ role, content }: MessageProps) {
    return (
        <div
            className={`whitespace-pre-line px-3 py-2 w-fit rounded-md text-sm ${role === 'user'
                ? 'bg-neutral-light dark:bg-neutral-dark ml-auto self-end rounded-tl-3xl rounded-tr-3xl  rounded-bl-3xl rounded-br-lg'
                : 'bg-transparent self-start'
                }`}
        >
            <p>{content}</p>
        </div>
    )
}