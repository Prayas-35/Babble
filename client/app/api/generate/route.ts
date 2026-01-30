import { NextRequest, NextResponse } from 'next/server';
import { generate } from '@/utils/generate';
import { parseUntilJson } from '@/utils/parse_until_json';

const SYSTEM_PROMPT = `You are a helpful assistant that strictly responds in JSON format based on the user's prompt.
If the user's prompt is ambiguous, you must ask clarifying questions in JSON format.
Always ensure the JSON you return is valid and properly formatted.
Do not include any explanations or additional text outside of the JSON response.`;

export async function postHandler(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const responseText = await generate(prompt);

    const parsedResponse = parseUntilJson(responseText as string);

    return NextResponse.json({ response: parsedResponse });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    );
  }
}

export { postHandler as POST };
