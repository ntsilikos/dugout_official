import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { lookupCert } from "@/lib/cert-lookup";

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const { company, cert_number } = await request.json();

    if (!company || !cert_number) {
      return NextResponse.json(
        { error: "company and cert_number are required" },
        { status: 400 }
      );
    }

    const result = await lookupCert(company, cert_number);

    if (!result) {
      return NextResponse.json(
        { error: "Certificate not found or lookup unavailable for this grading company" },
        { status: 404 }
      );
    }

    return NextResponse.json({ result });
  });
}
