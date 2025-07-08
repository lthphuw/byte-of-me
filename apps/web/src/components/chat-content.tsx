'use client';

import { useChatSession } from '@/hooks/use-chat-session';
import { useMounted } from '@/hooks/use-mounted';
import { useWindowScroll } from '@/hooks/use-window-scroll';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChatInput from './chat-input';
import { ChatTitle } from './chat-title';
import Loading from './loading';
import { Message } from './message';

export type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export default function ChatContent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const threadId = useChatSession();
    const [_, scrollTo] = useWindowScroll()

    const [loading, setLoading] = useState(false);
    const [loadingFromThreadId, setLoadingFromThreadId] = useState(false);
    const mounted = useMounted();
    const bottomRef = useRef<HTMLDivElement | null>(null);

    // Auto scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Load messages from local storage on component mount
    useEffect(() => {
        if (!mounted || !threadId) return;
        (async () => {
            setLoadingFromThreadId(true);
            try {
                const res = await fetch(`/api/chat/history?thread_id=${threadId}`);
                const data = await res.json();
                if (Array.isArray(data.history)) {
                    setMessages(data.history);
                }
            } catch (err) {
                console.error('Error loading server history:', err);
            } finally {
                setLoadingFromThreadId(false);
            }
        })();
    }, [mounted, threadId]);


    const sendMessage = async (question: string, options?: { stream?: boolean }) => {
        scrollTo({ x: 0, y: 0 });
        const { stream } = options || { stream: true };
        if (!question.trim()) return;

        const userMessage: Message = { role: 'user', content: question };
        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);

        if (stream) {
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question,
                        stream: true,
                        thread_id: threadId,
                    }),
                });

                if (!res.body) throw new Error('No response stream');

                const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let content = '';

                setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    content += chunk;

                    setMessages((prev) =>
                        prev.map((msg, i) =>
                            i === prev.length - 1 ? { ...msg, content } : msg
                        )
                    );
                }
            } catch (err) {
                console.error(err);
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: 'Error while streaming response.' },
                ]);
            } finally {
                setLoading(false);
            }
        } else {
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                const data = await res.json();
                const botMessage: Message = {
                    role: 'assistant',
                    content: data.answer || 'No answer',
                };

                setMessages((prev) => [...prev, botMessage]);
            } catch (err) {
                console.error(err);
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: 'Error while fetching response.' },
                ]);
            } finally {
                setLoading(false);
            }
        }
    };

    // Clear chat history
    const clearChat = useCallback(() => {
        setMessages([]);
        window.location.reload();
    }, []);

    return (
        <div className="relative w-full mx-auto flex flex-col h-[80vh]">
            {
                loadingFromThreadId ? <Loading /> :
                    messages.length <= 0 ? (
                        <ChatTitle
                            invoke={sendMessage}
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth">
                            {messages.map((msg, i) => (
                                <Message key={i} content={msg.content} role={msg.role} />
                            ))}

                            {loading && <Loading />}

                            {/* Invisible div to scroll into view */}
                            <div ref={bottomRef} />
                        </div>
                    )
            }
            <ChatInput className="justify-end mt-auto" clearChat={clearChat} onSend={sendMessage} loading={loading} />
        </div>
    );
}