'use client';

import React from "react"

import { Mail, MessageSquare, Slack, Settings, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Channel {
    id: string;
    name: string;
    icon: React.ReactNode;
    unread: number;
    active?: boolean;
}

export function Sidebar() {
    const channels: Channel[] = [
        { id: 'email', name: 'Email', icon: <Mail className="w-5 h-5" />, unread: 3, active: true },
        { id: 'slack', name: 'Slack', icon: <Slack className="w-5 h-5" />, unread: 12 },
        { id: 'chat', name: 'Web Chat', icon: <MessageSquare className="w-5 h-5" />, unread: 5 },
    ];

    return (
        <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">I</span>
                    </div>
                    <h1 className="text-lg font-bold text-sidebar-foreground">Inbox</h1>
                </div>
                <p className="text-xs text-muted-foreground">Unified inbox</p>
            </div>

            {/* Channels */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {channels.map((channel) => (
                    <button
                        key={channel.id}
                        className={cn(
                            'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                            channel.active
                                ? 'bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/30'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent/5'
                        )}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                                'text-lg',
                                channel.active ? 'text-sidebar-primary' : 'text-muted-foreground'
                            )}>
                                {channel.icon}
                            </div>
                            <span className="text-sm font-medium">{channel.name}</span>
                        </div>
                        {channel.unread > 0 && (
                            <Badge variant="default" className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {channel.unread}
                            </Badge>
                        )}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/10 transition-colors text-sm">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-xs font-medium text-sidebar-foreground">You</p>
                        <p className="text-xs text-muted-foreground">user@example.com</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
