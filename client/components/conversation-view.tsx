'use client';

import { ArrowLeft, MoreVertical, Paperclip, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    isOwn: boolean;
    avatar: string;
}

export function ConversationView() {
    const [replyText, setReplyText] = useState('');

    const messages: Message[] = [
        {
            id: '1',
            sender: 'Sarah Chen',
            content: 'Hey, I wanted to follow up on the Q4 roadmap items. Can we schedule a sync this week?',
            timestamp: '9:45 AM',
            isOwn: false,
            avatar: 'SC',
        },
        {
            id: '2',
            sender: 'You',
            content: 'Hey Sarah! I can do Wednesday at 2 PM or Thursday morning. Which works better for you?',
            timestamp: '10:12 AM',
            isOwn: true,
            avatar: 'Y',
        },
        {
            id: '3',
            sender: 'Sarah Chen',
            content: 'Wednesday at 2 PM works perfectly. I\'ll send over the draft roadmap items this afternoon so you can review them beforehand.',
            timestamp: '10:28 AM',
            isOwn: false,
            avatar: 'SC',
        },
        {
            id: '4',
            sender: 'Sarah Chen',
            content: 'Also, I\'ll need your input on the timeline for the new feature requests. We\'re trying to balance scope with delivery speed.',
            timestamp: '10:29 AM',
            isOwn: false,
            avatar: 'SC',
        },
        {
            id: '5',
            sender: 'You',
            content: 'Sounds good! I\'ll review the roadmap items and come prepared with timeline estimates. See you Wednesday!',
            timestamp: '11:05 AM',
            isOwn: true,
            avatar: 'Y',
        },
    ];

    return (
        <div className="flex-1 bg-card flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="font-semibold text-foreground">Sarah Chen</h2>
                        <p className="text-xs text-muted-foreground">Email • sarah@company.com</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-5 h-5" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                    <div key={message.id} className={cn(
                        'flex gap-3',
                        message.isOwn && 'flex-row-reverse'
                    )}>
                        {/* Avatar */}
                        <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                            message.isOwn
                                ? 'bg-primary/20 text-primary'
                                : 'bg-secondary/60 text-foreground'
                        )}>
                            {message.avatar}
                        </div>

                        {/* Message Content */}
                        <div className={cn(
                            'flex flex-col gap-1',
                            message.isOwn && 'items-end'
                        )}>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground">{message.sender}</span>
                                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                            </div>
                            <div className={cn(
                                'rounded-lg px-4 py-2 max-w-md text-sm',
                                message.isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-foreground'
                            )}>
                                {message.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reply Composer */}
            <div className="px-6 py-4 border-t border-border">
                <div className="flex gap-2 mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-2 border-border bg-transparent"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        AI Suggest
                    </Button>
                </div>
                <div className="flex gap-3 items-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-10 w-10"
                    >
                        <Paperclip className="w-5 h-5" />
                    </Button>
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        rows={3}
                        className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Button
                        className="h-10 w-10 bg-primary hover:bg-primary/90"
                        size="icon"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
