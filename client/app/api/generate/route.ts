import { NextRequest, NextResponse } from 'next/server';
import { generate } from '@/utils/generate';

export async function postHandler(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const responseText = await generate(prompt);

    return NextResponse.json({ response: responseText });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    );
  }
}

export { postHandler as POST };
