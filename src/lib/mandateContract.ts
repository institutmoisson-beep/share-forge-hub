export interface MandateContractData {
  transactionId: string;
  purchaseDate: string;
  userName: string;
  userEmail: string;
  userCity?: string;
  userCountry?: string;
  packName: string;
  packPrice: number;
  commissionEvery3Days: number;
  durationDays: number;
  nextPaymentDate: string;
  paymentMethod: "wallet" | "msn";
  coinsUsed?: number;
}

export const generateMandateContractPDF = (data: MandateContractData): void => {
  const contractRef = MSN-MAND-${data.transactionId.slice(0, 8).toUpperCase()};
  const endDate = new Date(data.purchaseDate);
  endDate.setDate(endDate.getDate() + data.durationDays);
  const endDateStr = endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const purchaseDateStr = new Date(data.purchaseDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const totalExpectedCommission = Math.floor(data.durationDays / 3) * data.commissionEvery3Days;
  const paymentMethodLabel = data.paymentMethod === "msn"
    ? MSN Coins (${data.coinsUsed} coins)
    : "Portefeuille FCFA";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Contrat de Mandat de Vente — ${contractRef}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'DM Sans',sans-serif;color:#0f172a;background:#fff;padding:40px;max-width:850px;margin:0 auto;font-size:14px;line-height:1.6;}
  
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #7c3aed;}
  .logo-block{display:flex;align-items:center;gap:12px;}
  .logo-icon{width:56px;height:56px;background:linear-gradient(135deg,#7c3aed,#5b21b6);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Playfair Display',serif;font-size:24px;font-weight:700;}
  .logo-text h1{font-family:'Playfair Display',serif;font-size:22px;color:#7c3aed;font-weight:700;}
  .logo-text p{font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase;}
  .ref-block{text-align:right;}
  .ref-block .contract-type{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px;}
  .ref-block .ref-num{font-size:12px;color:#64748b;font-family:monospace;}
  .ref-block .date{font-size:12px;color:#64748b;margin-top:4px;}

  .status-banner{background:linear-gradient(135deg,#7c3aed10,#d4a01710);border:2px solid #7c3aed30;border-radius:12px;padding:16px 20px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;}
  .status-banner .status-text{font-size:13px;font-weight:600;color:#7c3aed;}
  .status-badge{background:#7c3aed;color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}

  .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;}
  .party-card{background:#f8f5ff;border-radius:12px;padding:16px;border:1px solid #e0d4f5;}
  .party-card .party-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;font-weight:700;margin-bottom:8px;}
  .party-card .party-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px;}
  .party-card .party-role{font-size:12px;color:#64748b;margin-bottom:6px;}
  .party-card .party-detail{font-size:12px;color:#475569;}

  .section{margin-bottom:24px;}
  .section-title{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
  .section-num{width:26px;height:26px;background:#7c3aed;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
  .section-title h2{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#0f172a;}
  .section-body{padding-left:34px;font-size:13px;color:#334155;line-height:1.7;}

  .pack-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;}
  .info-item{background:#f1f5f9;border-radius:8px;padding:12px;}
  .info-item .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:4px;}
  .info-item .value{font-size:16px;font-weight:700;color:#0f172a;}
  .info-item .value.highlight{color:#7c3aed;}
  .info-item .value.gold{color:#d4a017;}

  .commission-timeline{background:linear-gradient(135deg,#f8f5ff,#fffbeb);border:1px solid #e0d4f5;border-radius:12px;padding:16px;margin-top:12px;}
  .timeline-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e0d4f5;}
  .timeline-row:last-child{border-bottom:none;}
  .timeline-label{font-size:12px;color:#64748b;}
  .timeline-value{font-size:14px;font-weight:700;color:#7c3aed;}

  .legal-text{font-size:12px;color:#475569;line-height:1.8;}
  .legal-text strong{color:#0f172a;}

  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;padding-top:28px;border-top:2px solid #e2e8f0;}
  .sig-block .sig-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:12px;}
  .sig-hand{font-family:'Playfair Display',serif;font-size:32px;color:#7c3aed;font-style:italic;display:block;margin:8px 0;}
  .sig-name{font-weight:700;color:#0f172a;font-size:14px;}
  .sig-title{font-size:12px;color:#64748b;}
  .user-sig-space{height:50px;border-bottom:1px solid #cbd5e1;margin:8px 0;}

  .seal{text-align:center;margin:20px 0;}
  .seal-circle{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:80px;height:80px;border:3px double #d4a017;border-radius:50%;font-family:'Playfair Display',serif;font-size:9px;color:#d4a017;font-weight:700;text-align:center;line-height:1.3;}

  .footer{text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;}

  @media print{body{padding:20px;}-webkit-print-color-adjust:exact;print-color-adjust:exact;}
</style>
</head>
<body>

<div class="header">
  <div class="logo-block">
    <div class="logo-icon">🌾</div>
    <div class="logo-text">
      <h1>Institut Moisson</h1>
      <p>Retail-as-a-Service Platform</p>
    </div>
  </div>
  <div class="ref-block">
    <div class="contract-type">Contrat de Mandat de Vente</div>
    <div class="ref-num">Réf : ${contractRef}</div>
    <div class="date">Émis le ${purchaseDateStr}</div>
  </div>
</div>

<div class="status-banner">
  <span class="status-text">✅ Contrat actif — Mandat de Dépôt-Vente en cours</span>
  <span class="status-badge">Certifié Moisson</span>
</div>

<div class="parties">
  <div class="party-card">
    <div class="party-label">Le Dépositaire</div>
    <div class="party-name">Institut Moisson</div>
    <div class="party-role">Plateforme Retail-as-a-Service</div>
    <div class="party-detail">Représenté par Parfait Celvus<br/>Directeur Général</div>
  </div>
  <div class="party-card">
    <div class="party-label">Le Déposant</div>
    <div class="party-name">${data.userName}</div>
    <div class="party-role">Investisseur Moissonneur</div>
    <div class="party-detail">${data.userEmail}${data.userCity ? <br/>${data.userCity}${data.userCountry ? ", " + data.userCountry : ""} : ""}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">
    <div class="section-num">1</div>
    <h2>Objet du Contrat</h2>
  </div>
  <div class="section-body">
    <p>Le Déposant confie au Dépositaire, qui l'accepte, la propriété d'un stock de marchandises correspondant au Pack ci-dessous, pour une valeur totale de <strong>${data.packPrice.toLocaleString("fr-FR")} FCFA</strong>. Ce contrat formalise le dépôt de fonds et le mandat de vente donné à l'Institut Moisson.</p>
    <div class="pack-info-grid">
      <div class="info-item">
        <div class="label">Pack souscrit</div>
        <div class="value">${data.packName}</div>
      </div>
      <div class="info-item">
        <div class="label">Montant investi</div>
        <div class="value highlight">${data.packPrice.toLocaleString("fr-FR")} FCFA</div>
      </div>
      <div class="info-item">
        <div class="label">Mode de paiement</div>
        <div class="value">${paymentMethodLabel}</div>
      </div>
      <div class="info-item">
        <div class="label">Date de début</div>
        <div class="value">${purchaseDateStr}</div>
      </div>
      <div class="info-item">
        <div class="label">Date de fin prévue</div>
        <div class="value">${endDateStr}</div>
      </div>
      <div class="info-item">
        <div class="label">Durée du mandat</div>
        <div class="value">${data.durationDays} jours</div>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">
    <div class="section-num">2</div>
    <h2>Mandat de Vente</h2>
  </div>
  <div class="section-body legal-text">
    Le Déposant donne mandat <strong>exclusif</strong> au Dépositaire (Institut Moisson) de vendre les produits constituant le pack en son nom et pour son compte pendant la durée définie. Le Dépositaire s'occupe intégralement de la logistique, du stockage, de la distribution auprès des consommateurs finaux et de la gestion commerciale.
  </div>
</div>

<div class="section">
  <div class="section-title">
    <div class="section-num">3</div>
    <h2>Rémunération & Commissions</h2>
  </div>
  <div class="section-body">
    <p class="legal-text">En contrepartie de la vente des produits, le Déposant percevra automatiquement une commission de vente créditée sur son portefeuille numérique.</p>
    <div class="commission-timeline">
      <div class="timeline-row">
        <span class="timeline-label">Commission tous les 3 jours</span>
        <span class="timeline-value">${data.commissionEvery3Days.toLocaleString("fr-FR")} FCFA</span>
      </div>
      <div class="timeline-row">
        <span class="timeline-label">Prochaine échéance</span>
        <span class="timeline-value">${data.nextPaymentDate}</span>
      </div>
      <div class="timeline-row">
        <span class="timeline-label">Nombre de versements estimés</span>
        <span class="timeline-value">${Math.floor(data.durationDays / 3)} versements</span>
      </div>
      <div class="timeline-row">
        <span class="timeline-label">Commission totale estimée</span>
        <span class="timeline-value">${totalExpectedCommission.toLocaleString("fr-FR")} FCFA</span>
      </div>
      <div class="timeline-row">
        <span class="timeline-label">Mode de versement</span>
        <span class="timeline-value">Automatique sur Portefeuille</span>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">
    <div class="section-num">4</div>
    <h2>Durée du Mandat</h2>
  </div>
  <div class="section-body legal-text">
    Le présent contrat est conclu pour une durée de <strong>${data.durationDays} jours calendaires</strong>, à compter du <strong>${purchaseDateStr}</strong>, jusqu'au <strong>${endDateStr}</strong>. À l'issue de cette période, le capital peut être réinvesti ou retiré selon les conditions en vigueur sur la plateforme Institut Moisson.
  </div>
</div>

<div class="section">
  <div class="section-title">
    <div class="section-num">5</div>
    <h2>Obligations du Dépositaire</h2>
  </div>
  <div class="section-body legal-text">
    L'Institut Moisson s'engage à :<br/>
    • Assurer la <strong>conservation du stock</strong> contre le vol, la perte ou les dégradations ;<br/>
    • Garantir la <strong>transparence totale</strong> des ventes via le tableau de bord de l'utilisateur ;<br/>
    • Verser les commissions dans les <strong>délais contractuels</strong> de 3 jours ;<br/>
    • Fournir un <strong>support client</strong> disponible pour toute question relative au contrat.
  </div>
</div>

<div class="section">
  <div class="section-title">
    <div class="section-num">6</div>
    <h2>Résiliation & Litiges</h2>
  </div>
  <div class="section-body legal-text">
    En cas de litige, les parties s'engagent à privilégier une résolution amiable dans un délai de 30 jours. À défaut d'accord, les <strong>tribunaux de commerce${data.userCountry ? " de " + data.userCountry : ""}</strong> seront seuls compétents. Le présent contrat est soumis au droit applicable dans le pays de résidence du Déposant.
  </div>
</div>

<div class="seal">
  <div class="seal-circle">MSN<br/>MANDATÉ<br/>✓<br/>CERTIFIÉ</div>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-label">Pour Institut Moisson (Dépositaire)</div>
    <span class="sig-hand">Parfait Celvus</span>
    <div class="sig-name">Parfait Celvus</div>
    <div class="sig-title">Directeur Général — Institut Moisson</div>
    <div style="margin-top:8px;font-size:11px;color:#94a3b8;">Lu et approuvé — Fait le ${purchaseDateStr}</div>
  </div>
  <div class="sig-block">
    <div class="sig-label">Le Déposant</div>
    <div class="user-sig-space"></div>
    <div class="sig-name">${data.userName}</div>
    <div class="sig-title">Investisseur Moissonneur</div>
    <div style="margin-top:8px;font-size:11px;color:#94a3b8;">Signature précédée de "Lu et approuvé"</div>
  </div>
</div>

<div class="footer">
  <p>Institut Moisson — Plateforme Retail-as-a-Service © ${new Date().getFullYear()} | Document juridique officiel — Reproduction interdite sans autorisation</p>
  <p style="margin-top:4px;">Réf : ${contractRef} | ${purchaseDateStr} | Unis pour prospérer & protéger 🌾</p>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => setTimeout(() => win.print(), 600);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
