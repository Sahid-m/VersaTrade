'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { type ChatMessage } from '@/lib/types';
import { type User } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUser: User;
}

export function GameChat({ messages, onSendMessage, currentUser }: GameChatProps) {
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Game Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4">
        <ScrollArea className="flex-grow h-48 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex items-start gap-3',
                  msg.senderId === currentUser.uid ? 'flex-row-reverse' : ''
                )}
              >
                <div className="flex flex-col">
                  <div
                    className={cn(
                      'p-3 rounded-lg max-w-xs',
                      msg.senderId === currentUser.uid
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <span className={cn(
                      "text-xs text-muted-foreground mt-1",
                       msg.senderId === currentUser.uid ? "text-right" : "text-left"
                    )}>
                      {msg.senderName}, {format(msg.timestamp, 'HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something..."
            autoComplete="off"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
