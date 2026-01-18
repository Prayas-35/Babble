"use server";

import { db } from "@/drizzle/index";
import { users } from "@/drizzle/schema/user";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json({ users: allUsers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fullName } = await request.json();
    const newUser = await db.insert(users).values({ fullName }).returning();
    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Error in POST /api/user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}