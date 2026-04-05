export interface Company {
  id: string;
  name: string;
  registreCommerce: string;
  country: string;
  city: string;
  location: string;
  sector: string;
  totalShares: number;
  availableShares: number;
  pricePerShare: number;
  previousPrice: number;
  logo: string;
  description: string;
  createdAt: string;
}

export interface UserShare {
  id: string;
  companyId: string;
  companyName: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  orderNumber: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale' | 'transfer';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  description: string;
}

export const mockCompanies: Company[] = [
  {
    id: "1",
    name: "AfriTech Solutions",
    registreCommerce: "RC-CMR-2024-001",
    country: "Cameroun",
    city: "Douala",
    location: "Bonanjo, Rue de la Joie",
    sector: "Informatique & Technologies",
    totalShares: 10000,
    availableShares: 7500,
    pricePerShare: 15000,
    previousPrice: 12000,
    logo: "",
    description: "Leader des solutions technologiques en Afrique Centrale, spécialisé dans le cloud computing et l'intelligence artificielle.",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "SolarVolt Energy",
    registreCommerce: "RC-CMR-2024-002",
    country: "Cameroun",
    city: "Yaoundé",
    location: "Bastos, Avenue Kennedy",
    sector: "Énergie & Environnement",
    totalShares: 20000,
    availableShares: 15000,
    pricePerShare: 8500,
    previousPrice: 9000,
    logo: "",
    description: "Entreprise pionnière dans l'énergie solaire en Afrique, fournissant des solutions durables aux communautés rurales.",
    createdAt: "2024-02-20",
  },
  {
    id: "3",
    name: "AgriGold Farms",
    registreCommerce: "RC-SEN-2024-003",
    country: "Sénégal",
    city: "Dakar",
    location: "Plateau, Rue Mohamed V",
    sector: "Agriculture",
    totalShares: 50000,
    availableShares: 35000,
    pricePerShare: 5000,
    previousPrice: 4500,
    logo: "",
    description: "Agriculture moderne et durable, exportation de produits bio vers l'Europe et l'Amérique.",
    createdAt: "2024-03-10",
  },
  {
    id: "4",
    name: "MediCare Plus",
    registreCommerce: "RC-CIV-2024-004",
    country: "Côte d'Ivoire",
    city: "Abidjan",
    location: "Cocody, Boulevard Latrille",
    sector: "Santé & Bien-être",
    totalShares: 15000,
    availableShares: 10000,
    pricePerShare: 25000,
    previousPrice: 22000,
    logo: "",
    description: "Réseau de cliniques modernes offrant des soins de qualité internationale en Afrique de l'Ouest.",
    createdAt: "2024-04-05",
  },
  {
    id: "5",
    name: "BuildPro Construction",
    registreCommerce: "RC-GAB-2024-005",
    country: "Gabon",
    city: "Libreville",
    location: "Centre-ville, Avenue du Bord de Mer",
    sector: "BTP & Construction",
    totalShares: 30000,
    availableShares: 20000,
    pricePerShare: 12000,
    previousPrice: 11500,
    logo: "",
    description: "Construction durable et innovation architecturale pour le développement urbain en Afrique Centrale.",
    createdAt: "2024-05-12",
  },
  {
    id: "6",
    name: "FinanceHub Africa",
    registreCommerce: "RC-CMR-2024-006",
    country: "Cameroun",
    city: "Douala",
    location: "Akwa, Rue de l'Hôpital",
    sector: "Banque & Finance",
    totalShares: 25000,
    availableShares: 18000,
    pricePerShare: 20000,
    previousPrice: 18000,
    logo: "",
    description: "Services financiers innovants pour les PME africaines, microfinance et solutions de paiement mobile.",
    createdAt: "2024-06-01",
  },
];

export const mockUserShares: UserShare[] = [
  {
    id: "s1",
    companyId: "1",
    companyName: "AfriTech Solutions",
    quantity: 50,
    purchasePrice: 12000,
    currentPrice: 15000,
    purchaseDate: "2024-06-15",
    orderNumber: "MSN-HC-ORD-000001",
  },
  {
    id: "s2",
    companyId: "3",
    companyName: "AgriGold Farms",
    quantity: 100,
    purchasePrice: 4500,
    currentPrice: 5000,
    purchaseDate: "2024-07-20",
    orderNumber: "MSN-HC-ORD-000002",
  },
  {
    id: "s3",
    companyId: "4",
    companyName: "MediCare Plus",
    quantity: 20,
    purchasePrice: 22000,
    currentPrice: 25000,
    purchaseDate: "2024-08-10",
    orderNumber: "MSN-HC-ORD-000003",
  },
];

export const mockTransactions: WalletTransaction[] = [
  { id: "t1", type: "deposit", amount: 500000, status: "approved", date: "2024-09-01", description: "Recharge via MTN Mobile Money" },
  { id: "t2", type: "purchase", amount: 600000, status: "approved", date: "2024-06-15", description: "Achat 50 actions AfriTech Solutions" },
  { id: "t3", type: "purchase", amount: 450000, status: "approved", date: "2024-07-20", description: "Achat 100 actions AgriGold Farms" },
  { id: "t4", type: "deposit", amount: 1000000, status: "approved", date: "2024-08-05", description: "Recharge via Orange Money" },
  { id: "t5", type: "purchase", amount: 440000, status: "approved", date: "2024-08-10", description: "Achat 20 actions MediCare Plus" },
  { id: "t6", type: "withdrawal", amount: 200000, status: "pending", date: "2024-09-15", description: "Retrait vers MTN Mobile Money" },
];
