import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { StatusCodes } from "http-status-codes";

export interface RequestWithUser extends NextRequest {
    user: User;
}

export function withAuth(
    handler: (req: RequestWithUser) => Promise<NextResponse> | NextResponse
) {
    return async (req: NextRequest) => {
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing auth token" },
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const accessToken = authHeader.replace("Bearer ", "");

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(accessToken);

        if (!user || error) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: StatusCodes.UNAUTHORIZED }
            );
        }

        const requestWithUser = req as RequestWithUser;
        requestWithUser.user = user;

        return handler(requestWithUser);
    };
}
