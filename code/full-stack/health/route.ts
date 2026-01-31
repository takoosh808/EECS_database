import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST() {
  const email = `user${Date.now()}@example.com`;

  const user = await prisma.user.create({
    data: { email, name: "Test User" },
  });

  return NextResponse.json(user, { status: 201 });
}