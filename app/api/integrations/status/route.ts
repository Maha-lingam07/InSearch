import { NextResponse } from "next/server";
import { connectedProviders } from "@/lib/credentials";

export async function GET() {
  try {
    return NextResponse.json(await connectedProviders());
  } catch {
    return NextResponse.json({ google: false, instagram: false, googleAccount: null, instagramAccount: null, setupError: "Account token storage is not configured." }, { status: 500 });
  }
}
