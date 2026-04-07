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

    const ensureAdmin = async () => {
      const { data, error } = await adminClient.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
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
      const userShareId = String(body.userShareId || "");
      const quantity = Number(body.quantity || 0);
      const pricePerShare = Number(body.pricePerShare || 0);

      if (!userShareId || quantity <= 0 || pricePerShare <= 0) {
        return json({ error: "Paramètres de mise en vente invalides." }, 400);
      }

      const { data: share, error: shareError } = await adminClient
        .from("user_shares")
        .select("*")
        .eq("id", userShareId)
        .eq("user_id", user.id)
        .single();

      if (shareError || !share) {
        return json({ error: "Titre introuvable." }, 404);
      }

      const { data: existingListings } = await adminClient
        .from("p2p_listings")
        .select("quantity")
        .eq("user_share_id", userShareId)
        .eq("seller_id", user.id)
        .eq("status", "active");

      const reservedQuantity = (existingListings || []).reduce((sum, listing) => sum + Number(listing.quantity || 0), 0);

      if (quantity > Number(share.quantity) - reservedQuantity) {
        return json({ error: "Vous n'avez pas assez de titres disponibles pour cette annonce." }, 400);
      }

      const { error } = await adminClient.from("p2p_listings").insert({
        company_id: share.company_id,
        user_share_id: share.id,
        seller_id: user.id,
        quantity,
        price_per_share: pricePerShare,
      });

      if (error) throw error;

      return json({ success: true, message: "Annonce publiée sur le marché secondaire." });
    }

    if (body.action === "purchase_listing") {
      const listingId = String(body.listingId || "");
      if (!listingId) {
        return json({ error: "Annonce invalide." }, 400);
      }

      const { data: listing, error: listingError } = await adminClient
        .from("p2p_listings")
        .select("*")
        .eq("id", listingId)
        .eq("status", "active")
        .single();

      if (listingError || !listing) {
        return json({ error: "Annonce introuvable ou déjà traitée." }, 404);
      }

      if (listing.seller_id === user.id) {
        return json({ error: "Vous ne pouvez pas acheter votre propre annonce." }, 400);
      }

      const buyerWallet = await getWallet(user.id);
      const sellerWallet = await getWallet(listing.seller_id);
      const total = Number(listing.price_per_share) * Number(listing.quantity);

      if (Number(buyerWallet.balance) < total) {
        return json({ error: "Solde insuffisant pour acheter cette annonce." }, 400);
      }

      const { data: sellerShare, error: sellerShareError } = await adminClient
        .from("user_shares")
        .select("*")
        .eq("id", listing.user_share_id)
        .eq("user_id", listing.seller_id)
        .single();

      if (sellerShareError || !sellerShare) {
        return json({ error: "Le titre du vendeur est introuvable." }, 404);
      }

      if (Number(sellerShare.quantity) < Number(listing.quantity)) {
        return json({ error: "Le vendeur ne dispose plus du volume annoncé." }, 400);
      }

      const buyerOrderNumber = await generateOrderNumber();

      const { error: buyerWalletError } = await adminClient.from("wallets").update({
        balance: Number(buyerWallet.balance) - total,
      }).eq("id", buyerWallet.id);
      if (buyerWalletError) throw buyerWalletError;

      const { error: sellerWalletError } = await adminClient.from("wallets").update({
        balance: Number(sellerWallet.balance) + total,
      }).eq("id", sellerWallet.id);
      if (sellerWalletError) throw sellerWalletError;

      const remainingQuantity = Number(sellerShare.quantity) - Number(listing.quantity);
      if (remainingQuantity > 0) {
        const { error: updateSellerShareError } = await adminClient.from("user_shares").update({
          quantity: remainingQuantity,
        }).eq("id", sellerShare.id);
        if (updateSellerShareError) throw updateSellerShareError;
      } else {
        const { error: deleteSellerShareError } = await adminClient.from("user_shares").delete().eq("id", sellerShare.id);
        if (deleteSellerShareError) throw deleteSellerShareError;
      }

      const { error: createBuyerShareError } = await adminClient.from("user_shares").insert({
        user_id: user.id,
        company_id: listing.company_id,
        quantity: Number(listing.quantity),
        purchase_price: Number(listing.price_per_share),
        order_number: buyerOrderNumber,
      });
      if (createBuyerShareError) throw createBuyerShareError;

      const { error: markSoldError } = await adminClient.from("p2p_listings").update({
        status: "sold",
        buyer_id: user.id,
        sold_at: new Date().toISOString(),
      }).eq("id", listing.id);
      if (markSoldError) throw markSoldError;

      const { error: buyerTxError } = await adminClient.from("wallet_transactions").insert({
        wallet_id: buyerWallet.id,
        user_id: user.id,
        amount: total,
        type: "purchase",
        status: "approved",
        description: `Achat P2P de ${listing.quantity} titre(s)`,
        processed_at: new Date().toISOString(),
      });
      if (buyerTxError) throw buyerTxError;

      const { error: sellerTxError } = await adminClient.from("wallet_transactions").insert({
        wallet_id: sellerWallet.id,
        user_id: listing.seller_id,
        amount: total,
        type: "sale",
        status: "approved",
        description: `Vente P2P de ${listing.quantity} titre(s)`,
        processed_at: new Date().toISOString(),
      });
      if (sellerTxError) throw sellerTxError;

      return json({ success: true, message: "Achat P2P confirmé.", orderNumber: buyerOrderNumber });
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
        description: `Fonds reçus de ${recipientMsnId}`,
        recipient_user_id: user.id,
        recipient_msn_id: recipientMsnId,
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