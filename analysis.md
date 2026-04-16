# Erreurs identifiées

1. AdminDashboard.tsx - `ensureAdmin()` vérifie seulement le rôle "admin" mais pas l'email spécial
2. AdminDashboard.tsx - Politique RLS sur companies: les rôles `gestionnaire_entreprises` et `courtier` ne peuvent pas voir toutes les companies
3. Supabase RLS - `user_shares` policy pour courtier/financier manque
4. MemberDashboard.tsx - `wallet_transactions` query dépend de `wallet` mais la query est activée sur `!!wallet` alors que `wallet` peut être undefined au premier render
5. AdminDashboard.tsx - `selectedRoles` type incorret (typo dans le type `AppRole|">"` devrait être `AppRole | ""`)
6. Dashboards.tsx - Import de Dashboard depuis `./pages/Dashboard.tsx` corrigé mais le commentaire reste
7. CompanyDetail.tsx - pas d'erreur majeure
8. platform-actions/index.ts - `ensureAdmin` ne vérifie pas l'email spécial
9. Supabase storage policy - les gestionnaire_entreprises ne peuvent pas uploader de logos
10. wallet_transactions RLS - financier ne peut pas voir toutes les transactions
11. user_shares RLS - financier/gestionnaire_achats ne peuvent pas voir toutes les shares
