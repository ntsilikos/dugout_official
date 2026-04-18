export interface CertLookupResult {
  player_name: string | null;
  year: number | null;
  brand: string | null;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  sport: string | null;
  grade_company: string;
  grade_value: number;
  grade_label: string;
  cert_number: string;
}

// PSA cert lookup via their public verification page
export async function lookupPSACert(
  certNumber: string
): Promise<CertLookupResult | null> {
  try {
    const res = await fetch(
      `https://www.psacard.com/cert/${certNumber}`,
      { headers: { "User-Agent": "Dugout/1.0" } }
    );
    if (!res.ok) return null;
    const html = await res.text();

    // Extract data from PSA cert page (basic parsing)
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const gradeMatch = html.match(/(?:Grade|grade)[:\s]*(\d+(?:\.\d+)?)/);

    if (!titleMatch) return null;

    const title = titleMatch[1];
    const grade = gradeMatch ? parseFloat(gradeMatch[1]) : 0;

    return {
      player_name: null,
      year: null,
      brand: null,
      set_name: null,
      card_number: null,
      variant: null,
      sport: null,
      grade_company: "PSA",
      grade_value: grade,
      grade_label: title,
      cert_number: certNumber,
    };
  } catch {
    return null;
  }
}

// Generic cert lookup dispatcher
export async function lookupCert(
  company: string,
  certNumber: string
): Promise<CertLookupResult | null> {
  switch (company.toUpperCase()) {
    case "PSA":
      return lookupPSACert(certNumber);
    case "BGS":
    case "SGC":
    case "CGC":
      // These would need their own API integrations
      return null;
    default:
      return null;
  }
}
