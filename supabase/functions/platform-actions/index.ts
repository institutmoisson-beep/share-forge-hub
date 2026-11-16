import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Configuration backend incomplète." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return json({ error: "Authentification requise." }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body?.action) {
      return json({ error: "Action manquante." }, 400);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ error: "Session invalide." }, 401);
    }

    const getWallet = async (userId: string) => {
      const { data, error } = await adminClient.from("wallets").select("*").eq("user_id", userId).single();
      if (error || !data) throw new Error("Portefeuille introuvable.");
      return data;
    };

    const generateOrderNumber = async () => {
      const { data, error } = await adminClient.rpc("generate_order_number");
      if (error || !data) throw new Error("Impossible de générer le numéro d'ordre.");
      return data as string;
    };

    // FIX: ensureAdmin vérifie aussi l'email spécial picelvus@gmail.com
    const ADMIN_EMAIL = "picelvus@gmail.com";
    const ensureAdmin = async () => {
      // Check by email first (special admin account)
      if (user.email === ADMIN_EMAIL) {
        return; // OK
      }
      // Check by role
      const { data, error } = await adminClient.rpc("has_role", {
        _role: "admin",
        _user_id: user.id,
      });

      if (error || !data) {
        throw new Error("Accès administrateur requis.");
      }
    };

    if (body.action === "purchase_company_shares") {
      const companyId = String(body.companyId || "");
      const quantity = Number(body.quantity || 0);

      if (!companyId || quantity <= 0) {
        return json({ error: "Informations d'achat invalides." }, 400);
      }

      const { data: company, error: companyError } = await adminClient
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .eq("is_active", true)
        .single();

      if (companyError || !company) {
        return json({ error: "Entreprise introuvable." }, 404);
      }

      if (company.available_shares < quantity) {
        return json({ error: "Le nombre de titres disponibles est insuffisant." }, 400);
      }

      const wallet = await getWallet(user.id);
      const total = Number(company.price_per_share) * quantity;

      if (Number(wallet.balance) < total) {
        return json({ error: "Solde insuffisant dans le portefeuille." }, 400);
      }

      const orderNumber = await generateOrderNumber();

      const { error: walletError } = await adminClient.from("wallets").update({
        balance: Number(wallet.balance) - total,
      }).eq("id", wallet.id);
      if (walletError) throw walletError;

      const { error: companyUpdateError } = await adminClient.from("companies").update({
        available_shares: company.available_shares - quantity,
        previous_price: Number(company.previous_price || company.price_per_share),
      }).eq("id", company.id);
      if (companyUpdateError) throw companyUpdateError;

      const { error: shareError } = await adminClient.from("user_shares").insert({
        user_id: user.id,
        company_id: company.id,
        quantity,
        purchase_price: Number(company.price_per_share),
        order_number: orderNumber,
      });
      if (shareError) throw shareError;

      const { error: transactionError } = await adminClient.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: user.id,
        amount: total,
        type: "purchase",
        status: "approved",
        description: `Achat de ${quantity} titre(s) - ${company.name}`,
        processed_at: new Date().toISOString(),
      });
      if (transactionError) throw transactionError;

      return json({
        success: true,
        message: "Achat validé.",
        orderNumber,
        total,
      });
    }

    if (body.action === "create_listing") {
      const unitIds = Array.isArray(body.unitIds) ? body.unitIds.map(String).slice(0, 1000) : [];
      const pricePerShare = Number(body.pricePerShare ?? 0);
      const mode = body.paymentMode === "external" ? "external" : "wallet";
      const targetMsn = typeof body.targetMsn === "string" ? body.targetMsn.slice(0, 30) : "";
      if (unitIds.length === 0 || !Number.isFinite(pricePerShare)) {
        return json({ error: "Sélectionnez les titres et indiquez un prix." }, 400);
      }
      const { data, error } = await adminClient.rpc("create_unit_listing", {
        _seller: user.id, _unit_ids: unitIds, _price: pricePerShare, _target_msn: targetMsn, _mode: mode,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, listingId: data });
    }

    if (body.action === "purchase_listing") {
      const listingId = String(body.listingId || "");
      const unitIds = Array.isArray(body.unitIds) ? body.unitIds.map(String).slice(0, 1000) : [];
      if (!listingId || unitIds.length === 0) return json({ error: "Sélectionnez au moins un titre." }, 400);
      const orderNumber = await generateOrderNumber();
      const { data, error } = await adminClient.rpc("buy_listing_units", {
        _listing: listingId, _buyer: user.id, _unit_ids: unitIds, _order: orderNumber,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, orderNumber, ...(data as Record<string, unknown>) });
    }

    if (body.action === "transfer_money") {
      const recipientMsnId = String(body.recipientMsnId || "").trim();
      const amount = Number(body.amount || 0);
      const description = String(body.description || "").trim();

      if (!recipientMsnId || amount <= 0) {
        return json({ error: "Informations de transfert invalides." }, 400);
      }

      const { data: recipientProfile, error: recipientProfileError } = await adminClient
        .from("profiles")
        .select("*")
        .eq("msn_id", recipientMsnId)
        .single();

      if (recipientProfileError || !recipientProfile) {
        return json({ error: "Destinataire introuvable." }, 404);
      }

      if (recipientProfile.user_id === user.id) {
        return json({ error: "Vous ne pouvez pas vous transférer des fonds à vous-même." }, 400);
      }

      const senderWallet = await getWallet(user.id);
      const recipientWallet = await getWallet(recipientProfile.user_id);

      if (Number(senderWallet.balance) < amount) {
        return json({ error: "Solde insuffisant pour ce transfert." }, 400);
      }

      const { error: senderWalletError } = await adminClient.from("wallets").update({
        balance: Number(senderWallet.balance) - amount,
      }).eq("id", senderWallet.id);
      if (senderWalletError) throw senderWalletError;

      const { error: recipientWalletError } = await adminClient.from("wallets").update({
        balance: Number(recipientWallet.balance) + amount,
      }).eq("id", recipientWallet.id);
      if (recipientWalletError) throw recipientWalletError;

      const transferDate = new Date().toISOString();

      // FIX: description correcte pour l'expéditeur (utilise recipientMsnId, pas l'email de l'expéditeur)
      const { data: senderProfile } = await adminClient
        .from("profiles")
        .select("msn_id")
        .eq("user_id", user.id)
        .single();

      const senderMsnId = senderProfile?.msn_id || "inconnu";

      const { error: senderTxError } = await adminClient.from("wallet_transactions").insert({
        wallet_id: senderWallet.id,
        user_id: user.id,
        amount,
        type: "transfer",
        status: "approved",
        description: description || `Transfert vers ${recipientMsnId}`,
        recipient_user_id: recipientProfile.user_id,
        recipient_msn_id: recipientMsnId,
        processed_at: transferDate,
      });
      if (senderTxError) throw senderTxError;

      const { error: recipientTxError } = await adminClient.from("wallet_transactions").insert({
        wallet_id: recipientWallet.id,
        user_id: recipientProfile.user_id,
        amount,
        type: "transfer",
        status: "approved",
        // FIX: description correcte pour le destinataire (qui a envoyé)
        description: `Fonds reçus de ${senderMsnId}`,
        recipient_user_id: user.id,
        recipient_msn_id: senderMsnId,
        processed_at: transferDate,
      });
      if (recipientTxError) throw recipientTxError;

      return json({ success: true, message: "Transfert effectué avec succès." });
    }

    if (body.action === "admin_process_transaction") {
      await ensureAdmin();

      const transactionId = String(body.transactionId || "");
      const decision = String(body.decision || "");

      if (!transactionId || !["approved", "rejected"].includes(decision)) {
        return json({ error: "Demande administrateur invalide." }, 400);
      }

      const { data: transaction, error: transactionError } = await adminClient
        .from("wallet_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (transactionError || !transaction) {
        return json({ error: "Transaction introuvable." }, 404);
      }

      if (transaction.status !== "pending") {
        return json({ error: "Cette demande a déjà été traitée." }, 400);
      }

      if (decision === "approved") {
        const wallet = await getWallet(transaction.user_id);

        if (transaction.type === "deposit") {
          const { error: depositWalletError } = await adminClient.from("wallets").update({
            balance: Number(wallet.balance) + Number(transaction.amount),
          }).eq("id", wallet.id);
          if (depositWalletError) throw depositWalletError;
        }

        if (transaction.type === "withdrawal") {
          if (Number(wallet.balance) < Number(transaction.amount)) {
            return json({ error: "Le solde de l'utilisateur est insuffisant pour ce retrait." }, 400);
          }

          const { error: withdrawalWalletError } = await adminClient.from("wallets").update({
            balance: Number(wallet.balance) - Number(transaction.amount),
          }).eq("id", wallet.id);
          if (withdrawalWalletError) throw withdrawalWalletError;
        }
      }

      const { error: updateTransactionError } = await adminClient.from("wallet_transactions").update({
        status: decision,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      }).eq("id", transaction.id);

      if (updateTransactionError) throw updateTransactionError;

      return json({ success: true, message: "Demande administrateur traitée." });
    }

    return json({ error: "Action inconnue." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
    return json({ error: message }, 500);
  }
});
