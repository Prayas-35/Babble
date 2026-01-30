import Groq from 'groq-sdk';

const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: { type: 'json_object' };
}

async function generate(
  prompt: string,
  systemPrompt?: string,
  options: GenerateOptions = {},
) {
  const {
    temperature = 0.3, // Lower temperature for more consistent JSON generation
    maxTokens = 1024,
    topP = 1,
    responseFormat,
  } = options;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

  // Add system prompt if provided
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Add user prompt
  messages.push({ role: 'user', content: prompt });

  const response = await groq.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    ...(responseFormat && { response_format: responseFormat }),
  });

  const contentWithThoughts = response.choices[0].message.content;

  // Remove thinking tags if present
  const contentWithoutThoughts = contentWithThoughts?.replace(
    /<think>.*?<\/think>/gs,
    '',
  );

  return contentWithoutThoughts?.trim() || '';
}

export { generate };
export type { GenerateOptions };
