import { supabase } from "@/integrations/supabase/client";

type PlatformActionName =
  | "purchase_company_shares"
  | "create_listing"
  | "purchase_listing"
  | "transfer_money"
  | "admin_process_transaction";

export async function invokePlatformAction<TResponse = Record<string, unknown>>(
  action: PlatformActionName,
  payload: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke("platform-actions", {
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    throw new Error(error.message || "Une erreur backend est survenue.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as TResponse;
}