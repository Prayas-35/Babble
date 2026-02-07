'use server';

import { NextResponse } from 'next/server';
import { withAuth, RequestWithUser } from '@/lib/middleware/auth.middleware';
import { db } from '@/drizzle/index';
import { organizations } from '@/drizzle/schema/organizations';
import { eq } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

/**
 * POST /api/user/ensure-org
 *
 * Ensures a default organization exists for the current user.
 * Creates one with id=1 if it doesn't exist yet.
 * Returns the organization record.
 */
async function handler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    // Check if org exists
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, 1))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ organization: existing[0] });
    }

    // Auto-create a default organization
    const userEmail = user.email || 'user';
    const orgName = `${userEmail.split('@')[0]}'s Workspace`;
    const orgSlug = userEmail
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug: orgSlug,
      })
      .returning();

    return NextResponse.json({ organization: newOrg });
  } catch (error) {
    console.error('Error ensuring organization:', error);
    return NextResponse.json(
      { error: 'Failed to ensure organization' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export const POST = withAuth(handler);
