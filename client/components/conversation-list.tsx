'use client';

import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface Conversation {
    id: string;
    sender: string;
    subject: string;
    preview: string;
    timestamp: string;
    unread: boolean;
    avatar: string;
    active?: boolean;
}

export function ConversationList() {
    const conversations: Conversation[] = [
        {
            id: '1',
            sender: 'Sarah Chen',
            subject: 'Q4 Planning Discussion',
            preview: 'Hey, I wanted to follow up on the Q4 roadmap items. Can we schedule a sync this week?',
            timestamp: '2 min ago',
            unread: true,
            avatar: 'SC',
            active: true,
        },
        {
            id: '2',
            sender: 'Alex Rodriguez',
            subject: 'API Integration Complete',
            preview: 'The new API endpoints are live. I\'ve added comprehensive documentation and tests.',
            timestamp: '1 hour ago',
            unread: true,
            avatar: 'AR',
        },
        {
            id: '3',
            sender: 'Team Support',
            subject: '[Support] User Dashboard Bug',
            preview: 'We received multiple reports about the dashboard loading issue. Should be addressed...',
            timestamp: '3 hours ago',
            unread: true,
            avatar: 'TS',
        },
        {
            id: '4',
            sender: 'Emma Wilson',
            subject: 'Design System Updates',
            preview: 'Just published the new component library. Check out the updated button variants...',
            timestamp: '5 hours ago',
            unread: false,
            avatar: 'EW',
        },
        {
            id: '5',
            sender: 'Marcus Johnson',
            subject: 'Performance Optimization',
            preview: 'Core Web Vitals have improved by 30%. The bundle optimization is showing great results.',
            timestamp: 'Yesterday',
            unread: false,
            avatar: 'MJ',
        },
    ];

    return (
        <div className="w-96 bg-card border-r border-border flex flex-col">
            {/* Search & Filter */}
            <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search conversations..."
                        className="pl-9 bg-input border-border"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input hover:bg-input/80 transition-colors text-xs text-muted-foreground">
                        <Filter className="w-3 h-3" />
                        <span>Unread</span>
                    </button>
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {conversations.map((conversation) => (
                    <button
                        key={conversation.id}
                        className={cn(
                            'w-full px-4 py-3 border-b border-border hover:bg-secondary transition-colors text-left',
                            conversation.active && 'bg-secondary/60'
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-semibold text-primary">{conversation.avatar}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <p className={cn(
                                        'text-sm truncate',
                                        conversation.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                                    )}>
                                        {conversation.sender}
                                    </p>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {conversation.timestamp}
                                    </span>
                                </div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 truncate">
                                    {conversation.subject}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {conversation.preview}
                                </p>
                            </div>

                            {/* Unread indicator */}
                            {conversation.unread && (
                                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
