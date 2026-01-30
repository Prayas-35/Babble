'use client';

import { Sidebar } from '@/components/sidebar';
import { ConversationList } from '@/components/conversation-list';
import { ConversationView } from '@/components/conversation-view';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const handleGenerate = async () => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Say Hello in 3 different languages. Return ONLY valid JSON.
                    Do not include explanations or extra text.

                    Format:
                    {
                      "languages": [
                        { "language": "Spanish", "value": "Hola" },
                        { "language": "French", "value": "Bonjour" },
                        { "language": "German", "value": "Hallo" }
                      ]
                    }
                  `,
        }),
      });

      const data = await response.json();
      console.log('Generated response:', data.response);
    } catch (error) {
      console.error('Error generating response:', error);
    }
  };

  return (
    <>
      <div className="h-screen bg-background flex font-sans dark">
        {/* Left Sidebar - Channels */}
        <Sidebar />

        {/* Center Panel - Conversation List */}
        <ConversationList />

        {/* Right Panel - Conversation Detail */}
        <ConversationView />
      </div>

      <div>
        <Button onClick={handleGenerate}>click me</Button>
      </div>
    </>
  );
}
