"use client";

import { useHotkeys } from "@/hooks/use-hot-key";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Icons } from "./icons";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type ChatInputProps = {
    clearChat: () => void
    onSend: (message: string) => void;
    loading?: boolean;
    className?: string;
};

export default function ChatInput({ clearChat, onSend, loading, className }: ChatInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!input.trim() || loading) return;
        onSend(input.trim());
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useHotkeys([
        ["mod+enter", () => handleSend()],
    ]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("w-full bg-white/80 dark:bg-black/30 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 md:p-4 shadow-md dark:shadow-[0_4px_10px_rgba(255,255,255,0.05)]", className)}
        >
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask something..."
                className="w-full resize-none border-none outline-none bg-transparent text-neutral-800 dark:text-neutral-100 text-lg placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />

            <div className="mt-2 flex gap-3 justify-end">
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="icon" onClick={clearChat}>
                                <Icons.trash />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={4} side="top">
                            <div>
                                <p>Clear chat</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Button
                    variant='default'
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="px-4 py-1.5 text-sm rounded-md bg-black dark:bg-white text-white dark:text-black disabled:opacity-50"
                >
                    {loading ? "Asking..." : "Ask"}
                </Button>
            </div>
        </motion.div>
    );
}
