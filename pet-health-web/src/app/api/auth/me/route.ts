import { NextResponse } from "next/server";
import { clearSessionCookies, getAccessToken, getSessionUser } from "@/lib/session";
import { deleteMyAccount } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  const session = await getSessionUser();
  if (!session.isLoggedIn || !session.token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    data: session.account,
    isAdmin: session.isAdmin,
  });
}

export async function DELETE() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteMyAccount(token);
    const res = new NextResponse(null, { status: 204 });
    clearSessionCookies(res);
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
