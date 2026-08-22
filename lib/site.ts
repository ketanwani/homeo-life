export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function getCalendlyUrl() {
  return process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/homeolife/consultation";
}

export function getWhatsAppUrl(message: string) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6593571688";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
