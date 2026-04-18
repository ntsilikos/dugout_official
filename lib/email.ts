import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSearchMatchEmail(
  to: string,
  searchName: string,
  matchCount: number,
  searchUrl: string
) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "your-resend-api-key") {
    return; // Skip if not configured
  }

  await resend.emails.send({
    from: "Dugout <notifications@getdugout.com>",
    to,
    subject: `${matchCount} new match${matchCount > 1 ? "es" : ""} for "${searchName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">New Card Hunter Matches</h2>
        <p style="color: #6b7280;">
          Your search <strong>"${searchName}"</strong> found
          <strong>${matchCount}</strong> new result${matchCount > 1 ? "s" : ""}.
        </p>
        <a href="${searchUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Matches
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          You're receiving this because you have Card Hunter email notifications enabled.
        </p>
      </div>
    `,
  });
}

export async function sendListingSoldEmail(
  to: string,
  cardTitle: string,
  marketplace: string,
  priceCents: number
) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "your-resend-api-key") {
    return;
  }

  const price = (priceCents / 100).toFixed(2);
  await resend.emails.send({
    from: "Dugout <notifications@getdugout.com>",
    to,
    subject: `Card sold on ${marketplace} for $${price}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Card Sold!</h2>
        <p style="color: #6b7280;">
          <strong>"${cardTitle}"</strong> sold on <strong>${marketplace}</strong>
          for <strong>$${price}</strong>.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/listings" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View Listings
        </a>
      </div>
    `,
  });
}
