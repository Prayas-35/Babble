import { NextRequest, NextResponse } from 'next/server';
import { generate } from '@/utils/generate';
import { parseUntilJson } from '@/utils/parse_until_json';

// ============================================================================
// INTERFACES
// ============================================================================

interface ContextQuery {
  queries: string[];
}

interface MessageHistory {
  role: 'user' | 'agent' | 'system';
  content: string;
  channel?: 'email' | 'slack' | 'teams' | 'ticket';
  timestamp?: string;
}

interface RetrievedContext {
  query: string;
  content: string;
  metadata?: Record<string, any>;
}

interface ContextSummary {
  summary: string;
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const CONTEXT_QUERY_SYSTEM_PROMPT = `You are an expert Context Query Generator for a corporate unified messaging platform. Your role is to analyze incoming messages (emails, chat, tickets) and conversation history to generate 1-3 targeted queries for retrieving relevant context from the corporate knowledge base.

Critical Rules:
- Generate queries ONLY for information NOT already present in the conversation history
- Each query must be unique, specific, and non-overlapping
- Queries should be single topics or phrases relevant to the issue at hand
- In most cases, generate only 1 query unless the issue is broad or multi-faceted
- Focus on corporate policies, procedures, known issues, and solutions
- Do not rely on general knowledge - only analyze the provided context

Your response MUST be valid JSON with a single key "queries" containing an array of strings.
Do not include explanations, preambles, or text outside the JSON structure.`;

const CONTEXT_SUMMARY_SYSTEM_PROMPT = `You are an expert Context Summarizer for a corporate unified messaging platform. Your job is to analyze the user's message, conversation history, and topic to extract and summarize only the most relevant information from the context retrieved from the knowledge base.

Critical Rules:
- Do NOT summarize or repeat the user message or the conversation history
- Use the user message and conversation history only as background to understand what information is relevant
- Focus solely on the fetched context: extract the key facts, policies, procedures, or data that directly address the user's needs
- Filter out any irrelevant, redundant, or generic information (noise) that is not useful for the current conversation
- Your summary should be concise, focused, and should not include any information already present in the conversation history or user message
- Extract actionable information such as policies, procedures, SLAs, troubleshooting steps, or contact information

Your response MUST be valid JSON with a single key "summary" which is a string.
Do not include explanations, preambles, or text outside the JSON structure.`;

// ============================================================================
// FUNCTION 1: GENERATE CONTEXT QUERIES
// ============================================================================

async function generateContextQueries(
  message: string,
  messageHistory: MessageHistory[] = [],
  topic: string = 'General Support',
  channel: string = 'email',
): Promise<ContextQuery> {
  console.log('=== GENERATE CONTEXT QUERIES - START ===');
  console.log('Input message:', message);
  console.log('Topic:', topic);
  console.log('Channel:', channel);
  console.log('Message history length:', messageHistory.length);

  // Format conversation history for the prompt
  const formattedHistory = messageHistory
    .slice(-10) // Last 10 turns only
    .map(
      (msg: MessageHistory) =>
        `${msg.role.toUpperCase()}: "${msg.content}"${msg.channel ? ` [${msg.channel}]` : ''}`,
    )
    .join('\n');

  console.log(
    'Formatted history:',
    formattedHistory || 'No previous conversation',
  );

  const userPrompt = `You are analyzing a ${channel} message for a corporate support system. Generate context queries to retrieve relevant information from the knowledge base.

**Conversation History (Last 10 turns):**
${formattedHistory || 'No previous conversation'}

**Current ${channel.toUpperCase()} Message:**
"${message}"

**Identified Topic:**
"${topic}"

**Task:**
Generate 1-3 specific queries to retrieve context that would help an agent respond to this message. The queries should target:
- Relevant corporate policies or procedures
- Known issues and solutions
- Technical documentation
- Previous similar cases or templates
- Required approval workflows or escalation paths

**Important Examples:**

**Example 1 - Maintenance Complaint:**

**Conversation History:**
AGENT: "Thank you for contacting facilities. How can I help you today?"
USER: "The AC in conference room B3 hasn't been working since Monday." [email]

**Current EMAIL Message:**
"It's getting really hot in here and we have an important client meeting tomorrow at 2 PM. Can someone fix this urgently?"

**Identified Topic:**
"HVAC Maintenance Request"

**Output:**
{
  "queries": ["Conference Room B3 HVAC", "Emergency HVAC Repair SLA"]
}

---

**Example 2 - Access Request:**

**Conversation History:**
No previous conversation

**Current EMAIL Message:**
"Hi, I'm the new marketing manager starting next week. I need access to the company's social media management tools, analytics dashboard, and the shared drive for the marketing team. My employee ID is EMP-2847."

**Identified Topic:**
"New Employee Access Request"

**Output:**
{
  "queries": ["Marketing Team Access Provisioning", "New Employee Onboarding Checklist"]
}

---

**Example 3 - Policy Question:**

**Conversation History:**
USER: "I have a question about remote work policy" [slack]
AGENT: "Sure! What would you like to know?"

**Current EMAIL Message:**
"Can I work from another country for 3 months while visiting family? I'd still be working normal hours."

**Identified Topic:**
"Remote Work Policy"

**Output:**
{
  "queries": ["International Remote Work Policy"]
}

---

**Example 4 - Technical Issue (Multiple Queries):**

**Conversation History:**
USER: "Our team can't access the customer portal" [ticket]
AGENT: "Which specific error are you seeing?"

**Current EMAIL Message:**
"We get a 'Database Connection Failed' error when trying to log in. This is affecting our ability to process orders and about 15 team members are impacted. We're also getting customer complaints."

**Identified Topic:**
"Portal Access Issue"

**Output:**
{
  "queries": ["Customer Portal Database Errors", "Portal Outage Communication Template", "Order Processing Backup Procedures"]
}

---

Now generate the context queries for the provided message above.

**Output (JSON only):**`;

  console.log('Calling LLM for context query generation...');

  const responseText = await generate(userPrompt, CONTEXT_QUERY_SYSTEM_PROMPT, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' },
  });

  console.log('LLM raw response:', responseText);

  const parsedResponse = parseUntilJson(responseText as string) as ContextQuery;

  console.log('Parsed response:', parsedResponse);

  // Validation
  if (!parsedResponse.queries || !Array.isArray(parsedResponse.queries)) {
    console.error('❌ Validation failed: queries array is missing or invalid');
    throw new Error('Invalid response format: queries array is required');
  }

  console.log('✅ Generated queries:', parsedResponse.queries);

  if (
    parsedResponse.queries.length === 0 ||
    parsedResponse.queries.length > 3
  ) {
    console.warn(
      `⚠️ Unexpected number of queries generated: ${parsedResponse.queries.length}`,
    );
  }

  console.log('=== GENERATE CONTEXT QUERIES - END ===\n');

  return parsedResponse;
}

// ============================================================================
// FUNCTION 2: SUMMARIZE CONTEXT
// ============================================================================

async function summarizeContext(
  message: string,
  messageHistory: MessageHistory[] = [],
  topic: string = 'General Support',
  contextQuery: string,
  retrievedContext: RetrievedContext[],
): Promise<ContextSummary> {
  console.log('=== SUMMARIZE CONTEXT - START ===');
  console.log(
    `Summarizing ${retrievedContext.length} items for query: ${contextQuery}`,
  );

  // Format conversation history
  const formattedHistory = messageHistory
    .slice(-10) // Last 10 turns only
    .map(
      (msg: MessageHistory) =>
        `${msg.role.toUpperCase()}: "${msg.content}"${msg.channel ? ` [${msg.channel}]` : ''}`,
    )
    .join('\n');

  // Format retrieved context
  const formattedContext = retrievedContext
    .map((ctx, index) => `[Context ${index + 1}]:\n${ctx.content}`)
    .join('\n\n---\n\n');

  console.log('Formatted context length:', formattedContext.length);

  const userPrompt = `You are analyzing retrieved context from a corporate knowledge base. Your task is to extract and summarize ONLY the relevant information that addresses the current user's needs.

**Important Instructions:**
- Do NOT summarize or repeat the user message or the conversation history.
- Use the user message and conversation history only as background to understand what information is relevant to the current conversation.
- Focus solely on the fetched context: extract the key facts, policies, procedures, SLAs, troubleshooting steps, or contact information that directly address the user's needs.
- Filter out any irrelevant, redundant, or generic information (noise) that is not useful for the current conversation.
- Your summary should be concise, focused, and should not include any information already present in the conversation history or user message.
- Extract actionable information such as: specific procedures, approval requirements, deadlines, escalation paths, known solutions, or relevant contact information.

Your output should be a JSON with a single key "summary" which is a string, in the following format:

{
  "summary": "<summary of the relevant information from the fetched context>"
}

**User Message:**
${message}

**Conversation History (Last 10 turns):**
${formattedHistory || 'No previous conversation'}

**Topic:**
${topic}

**Context Query Used:**
${contextQuery}

**Fetched Context to be Summarized:**
${formattedContext || 'No context retrieved'}

**Examples:**

**Example 1:**

**User Message:**
"The AC in conference room B3 has been broken since Monday. We have a client meeting tomorrow at 2 PM."

**Context Query Used:**
"Emergency HVAC Repair SLA"

**Fetched Context:**
"[Context 1]:
Emergency HVAC repairs are prioritized based on impact level. Conference rooms are classified as High Priority. Response time: 2 hours. Resolution target: 24 hours for emergency cases. After-hours emergency contact: facilities-emergency@company.com or ext. 5555."

**Output:**
{
  "summary": "Emergency HVAC repairs for conference rooms have a 2-hour response time and 24-hour resolution target. For immediate assistance, contact facilities-emergency@company.com or extension 5555."
}

---

**Example 2:**

**User Message:**
"I need access to the marketing shared drive. I'm the new social media coordinator starting next week."

**Context Query Used:**
"Marketing Team Access Provisioning"

**Fetched Context:**
"[Context 1]:
New employee access requests require Form IT-101 with manager approval. Marketing team access includes: Shared Drive, Hootsuite, Analytics Dashboard. Processing time: 24 hours after form submission. For expedited requests (starting within 48 hours), mark form as URGENT and CC it-priority@company.com."

**Output:**
{
  "summary": "Submit Form IT-101 with manager approval to request marketing team access (Shared Drive, Hootsuite, Analytics Dashboard). Standard processing is 24 hours. For expedited access when starting within 48 hours, mark the form URGENT and CC it-priority@company.com."
}

---

**Example 3:**

**User Message:**
"Can I work remotely from Canada for 3 months while visiting family? I'll maintain regular hours."

**Context Query Used:**
"International Remote Work Policy"

**Fetched Context:**
"[Context 1]:
International remote work exceeding 30 days requires advance approval. Requirements: (1) Submit Form HR-204 at least 4 weeks before travel, (2) Manager approval, (3) HR and Legal review for tax/compliance implications, (4) IT approval for secure network access. Approval timeline: 2-3 weeks. Contact: global-mobility@company.com for questions."

**Output:**
{
  "summary": "International remote work over 30 days requires Form HR-204 submitted 4 weeks in advance, with approvals from manager, HR, Legal, and IT. The approval process takes 2-3 weeks. Contact global-mobility@company.com for assistance with the process."
}

---

Now summarize the context for the provided message above.

**Output (JSON only):**`;

  console.log('Calling LLM for context summarization...');

  const responseText = await generate(
    userPrompt,
    CONTEXT_SUMMARY_SYSTEM_PROMPT,
    {
      temperature: 0.3,
      responseFormat: { type: 'json_object' },
    },
  );

  console.log('LLM raw response:', responseText);

  const parsedResponse = parseUntilJson(
    responseText as string,
  ) as ContextSummary;

  console.log('Parsed summary response:', parsedResponse);

  // Validation
  if (!parsedResponse.summary || typeof parsedResponse.summary !== 'string') {
    console.error('❌ Validation failed: summary string is missing or invalid');
    throw new Error('Invalid response format: summary string is required');
  }

  console.log(
    `✅ Summary generated: ${parsedResponse.summary.length} chars for query: ${contextQuery}`,
  );
  console.log('=== SUMMARIZE CONTEXT - END ===\n');

  return parsedResponse;
}

// ============================================================================
// MAIN API ROUTE HANDLER
// ============================================================================

export async function postHandler(request: NextRequest) {
  console.log('\n========================================');
  console.log('NEW REQUEST RECEIVED');
  console.log('========================================\n');

  try {
    const body = await request.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    const {
      message,
      messageHistory = [],
      topic = 'General Support',
      channel = 'email',
      retrievedContext = [], // Optional: pass in already retrieved context
    } = body;

    if (!message) {
      console.error('❌ Error: Message content is missing');
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 },
      );
    }

    console.log('\n--- Step 1: Generate Context Queries ---');
    // Step 1: Generate context queries
    const contextQueries = await generateContextQueries(
      message,
      messageHistory,
      topic,
      channel,
    );

    console.log('\n--- Step 2: Context Retrieval (TODO) ---');
    console.log('⏳ TODO: Retrieve actual context from knowledge base');
    console.log('Queries to use for retrieval:', contextQueries.queries);

    // Step 2: TODO - Retrieve actual context from knowledge base using the queries
    // const retrievedContext = await retrieveFromKnowledgeBase(contextQueries.queries);

    console.log('\n--- Step 3: Summarize Retrieved Context ---');
    // Step 3: Summarize retrieved context (if provided)
    let summaries: Record<string, string> = {};

    if (retrievedContext && retrievedContext.length > 0) {
      console.log(
        `📋 Processing ${retrievedContext.length} retrieved context items`,
      );

      // Group context by query
      const contextByQuery: Record<string, RetrievedContext[]> = {};

      for (const ctx of retrievedContext) {
        if (!contextByQuery[ctx.query]) {
          contextByQuery[ctx.query] = [];
        }
        contextByQuery[ctx.query].push(ctx);
      }

      console.log('Context grouped by queries:', Object.keys(contextByQuery));

      // Summarize context for each query
      for (const [query, contexts] of Object.entries(contextByQuery)) {
        console.log(`\n📝 Summarizing context for query: "${query}"`);
        const summary = await summarizeContext(
          message,
          messageHistory,
          topic,
          query,
          contexts,
        );
        summaries[query] = summary.summary;
      }
    } else {
      console.log('ℹ️ No retrieved context provided to summarize');
    }

    const responseData = {
      queries: contextQueries.queries,
      summaries: summaries,
      metadata: {
        topic,
        channel,
        queryCount: contextQueries.queries.length,
        summaryCount: Object.keys(summaries).length,
      },
    };

    console.log('\n========================================');
    console.log('📤 RESPONSE DATA:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('========================================\n');

    const parsedReturnData = JSON.parse(JSON.stringify(responseData));
    return NextResponse.json(parsedReturnData);
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ ERROR OCCURRED:');
    console.error(error);
    console.error('========================================\n');

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to process request',
      },
      { status: 500 },
    );
  }
}

export { postHandler as POST };
