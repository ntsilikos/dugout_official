export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getCardTitle(card: {
  player_name?: string | null;
  year?: number | null;
  brand?: string | null;
  set_name?: string | null;
  card_number?: string | null;
}): string {
  const parts: string[] = [];
  if (card.year) parts.push(String(card.year));
  if (card.brand) parts.push(card.brand);
  if (card.set_name) parts.push(card.set_name);
  if (card.player_name) parts.push(card.player_name);
  if (card.card_number) parts.push(`#${card.card_number}`);
  return parts.join(" ") || "Unknown Card";
}
