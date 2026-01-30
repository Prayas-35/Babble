'use client';

import { Sidebar } from '@/components/sidebar';
import { ConversationList } from '@/components/conversation-list';
import { ConversationView } from '@/components/conversation-view';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const handleGenerate = async () => {
    try {
      console.log('🚀 Starting test...');

      const testInput = {
        message: `Subject: Urgent - Air Conditioning Broken in Conference Room B3

Hi Facilities Team,

The air conditioning system in Conference Room B3 has been malfunctioning since Monday morning. The room temperature is currently around 82°F, making it very uncomfortable for meetings.

We have an important client presentation scheduled for tomorrow at 2:00 PM with about 15 attendees, and I'm concerned about the conditions. This is affecting our team's productivity and could make a bad impression on our clients.

Could someone please look into this as soon as possible? Let me know if you need any additional information.

Thanks,
Sarah Mitchell
Marketing Manager`,
        messageHistory: [
          {
            role: 'agent',
            content:
              'Thank you for contacting Facilities Support. How can I assist you today?',
            channel: 'email',
            timestamp: '2024-01-29T09:00:00Z',
          },
          {
            role: 'user',
            content: 'I noticed the AC in B3 seems to be having issues.',
            channel: 'email',
            timestamp: '2024-01-29T09:15:00Z',
          },
        ],
        topic: 'HVAC Maintenance Request',
        channel: 'email',
        // Optional: Include retrieved context to test summarization
        retrievedContext: [
          {
            query: 'Conference Room B3 HVAC',
            content:
              'Conference Room B3 is equipped with a Carrier 5-ton HVAC unit (Model: 24ACC636), installed in 2020. The unit is serviced quarterly by BuildingCo Mechanical Services. Last maintenance: January 15, 2024. Common issues include thermostat calibration and refrigerant levels. The room capacity is 20 people.',
            metadata: {
              source: 'facilities-database',
              lastUpdated: '2024-01-15',
            },
          },
          {
            query: 'Conference Room B3 HVAC',
            content:
              'Recent service history for B3: December 2023 - Filter replacement. November 2023 - Routine inspection (no issues). October 2023 - Thermostat recalibration. The HVAC system is under warranty until December 2025.',
            metadata: {
              source: 'maintenance-logs',
              lastUpdated: '2024-01-10',
            },
          },
          {
            query: 'Emergency HVAC Repair SLA',
            content:
              'Emergency HVAC repairs are prioritized based on impact level. Conference rooms are classified as High Priority during business hours. Response time: 2 hours for high priority. Resolution target: 24 hours for emergency cases. After-hours emergency contact: facilities-emergency@company.com or ext. 5555. For issues affecting client meetings within 48 hours, escalate to Facilities Director: John Davis (ext. 5501).',
            metadata: {
              source: 'sla-policy',
              version: '2.1',
            },
          },
        ],
      };

      console.log('📤 Sending request with payload:', testInput);

      const response = await fetch('/api/generateSummary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testInput),
      });

      console.log('📡 Response status:', response.status);

      const data = await response.json();

      console.log('✅ Response received:');
      console.log('Generated Context Queries:', data.queries);
      console.log('Summaries:', data.summaries);
      console.log('Metadata:', data.metadata);

      // Pretty print the full response
      console.log('\n📋 Full Response:');
      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Error generating response:', error);
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
