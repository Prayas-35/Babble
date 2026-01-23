'use client';

import { Sidebar } from '@/components/sidebar';
import { ConversationList } from '@/components/conversation-list';
import { ConversationView } from '@/components/conversation-view';

export default function DashboardPage() {
    return (
        <div className="h-screen bg-background flex font-sans dark">
            {/* Left Sidebar - Channels */}
            <Sidebar />

            {/* Center Panel - Conversation List */}
            <ConversationList />

            {/* Right Panel - Conversation Detail */}
            <ConversationView />
        </div>
    );
}
