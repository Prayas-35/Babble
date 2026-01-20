"use server";

import { NextRequest, NextResponse } from "next/server";
import { withAuth, RequestWithUser } from "@/lib/middleware/auth.middleware";
import { db } from "@/drizzle/index";
import { providerAccounts } from "@/drizzle/schema/provider_acounts";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

async function getHandler(request: RequestWithUser) {
    const user = request.user;
    if (user instanceof NextResponse) {
        return user; // Return error response if authentication fails
    }

    try {
        // const accounts = await db.select().from(providerAccounts).where(eq(providerAccounts.userId, user.id));
        return NextResponse.json({ User: user });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch provider accounts" },
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}

export const GET = withAuth(getHandler);