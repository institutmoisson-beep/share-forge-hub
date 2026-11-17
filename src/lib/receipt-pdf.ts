import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type ReceiptData = {
  orderNumber: string;
  company: string;
  unitCodes: string[];
  pricePerUnit: number;
  total: number;
  buyerName: string;
  buyerMsn?: string;
  buyerPhone?: string | null;
  mode: "market" | "otc" | "direct";
  date?: Date;
};

const MODE_LABEL = { market: "Annonce publique (portefeuille)", otc: "Gré à gré (portefeuille)", direct: "Cession directe (paiement hors application)" };
const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`;

/** Builds and downloads the purchase receipt listing exactly the title numbers bought. */
export async function downloadReceiptPdf(d: ReceiptData) {
  const date = d.date ?? new Date();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const qr = await QRCode.toDataURL(`${window.location.origin}/verify?order=${encodeURIComponent(d.orderNumber)}`, { margin: 1, width: 240 });
  doc.setFillColor(10, 18, 38); doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(212, 175, 55); doc.setFontSize(20); doc.text("MSN Hors Cote", 15, 15);
  doc.setFontSize(11); doc.setTextColor(230, 230, 230); doc.text("Reçu d'acquisition de titres", 15, 24);
  doc.setTextColor(20, 20, 20); doc.setFontSize(11);
  const rows: [string, string][] = [
    ["Numéro d'ordre", d.orderNumber],
    ["Entreprise", d.company],
    ["Acquéreur", d.buyerName + (d.buyerMsn ? ` (${d.buyerMsn})` : "")],
    ["Contact", d.buyerPhone || "—"],
    ["Date et heure", date.toLocaleString("fr-FR")],
    ["Mode de cession", MODE_LABEL[d.mode]],
    ["Nombre de titres", String(d.unitCodes.length)],
    ["Prix par titre", fmt(d.pricePerUnit)],
    ["Montant total", fmt(d.total)],
  ];
  let y = 45;
  rows.forEach(([k, v]) => { doc.setFont("helvetica", "bold"); doc.text(k, 15, y); doc.setFont("helvetica", "normal"); doc.text(v, 70, y); y += 8; });
  doc.addImage(qr, "PNG", 150, 40, 45, 45);
  y += 4; doc.setFont("helvetica", "bold"); doc.text("Numéros des titres acquis", 15, y); y += 7;
  doc.setFont("courier", "normal"); doc.setFontSize(10);
  d.unitCodes.forEach((c, i) => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(c, 15 + (i % 3) * 62, y);
    if (i % 3 === 2) y += 6;
  });
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(110, 110, 110);
  doc.text("Ce reçu ne remplace pas le registre officiel des titres tenu par l'émetteur. Une participation comporte un risque de perte en capital.", 15, 288, { maxWidth: 180 });
  doc.save(`recu-${d.orderNumber}.pdf`);
}
