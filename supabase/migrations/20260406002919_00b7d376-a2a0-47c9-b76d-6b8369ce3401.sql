
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'admin', 'courtier', 'financier', 'moderateur', 'consultant',
  'comptable', 'informaticien', 'communication',
  'gestionnaire_entreprises', 'gestionnaire_achats',
  'gestionnaire_utilisateurs'
);

-- Enums for statuses
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'purchase', 'sale', 'transfer');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'cancelled');
CREATE TYPE public.transfer_status AS ENUM ('pending', 'approved', 'rejected');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  msn_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- USER ROLES TABLE (must exist before has_role function)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Security definer function to check roles (after user_roles exists)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  registre_commerce TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_shares INTEGER NOT NULL DEFAULT 0,
  available_shares INTEGER NOT NULL DEFAULT 0,
  price_per_share NUMERIC(15,2) NOT NULL DEFAULT 0,
  previous_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  logo_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active companies" ON public.companies
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create companies" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete companies" ON public.companies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- USER SHARES TABLE
-- ============================================
CREATE TABLE public.user_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchase_price NUMERIC(15,2) NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shares" ON public.user_shares
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all shares" ON public.user_shares
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can purchase shares" ON public.user_shares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Courtiers can view all shares" ON public.user_shares
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'courtier'));
CREATE POLICY "Admins can manage shares" ON public.user_shares
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete shares" ON public.user_shares
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- WALLETS TABLE
-- ============================================
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PAYMENT SERVICES TABLE
-- ============================================
CREATE TABLE public.payment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  payment_link TEXT DEFAULT '',
  instructions TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active payment services" ON public.payment_services
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage payment services" ON public.payment_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payment_services_updated_at
  BEFORE UPDATE ON public.payment_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type public.transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status public.transaction_status NOT NULL DEFAULT 'pending',
  description TEXT DEFAULT '',
  payment_service_id UUID REFERENCES public.payment_services(id),
  payment_contact TEXT DEFAULT '',
  payment_transaction_id TEXT DEFAULT '',
  payment_date TIMESTAMP WITH TIME ZONE,
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_msn_id TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transactions" ON public.wallet_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update transactions" ON public.wallet_transactions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- P2P LISTINGS TABLE
-- ============================================
CREATE TABLE public.p2p_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_share_id UUID REFERENCES public.user_shares(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_share NUMERIC(15,2) NOT NULL CHECK (price_per_share > 0),
  status public.listing_status NOT NULL DEFAULT 'active',
  buyer_id UUID REFERENCES auth.users(id),
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view listings" ON public.p2p_listings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own listings" ON public.p2p_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own listings" ON public.p2p_listings
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage listings" ON public.p2p_listings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_p2p_listings_updated_at
  BEFORE UPDATE ON public.p2p_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SHARE TRANSFERS TABLE
-- ============================================
CREATE TABLE public.share_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_share_id UUID REFERENCES public.user_shares(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  transfer_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  status public.transfer_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.share_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers" ON public.share_transfers
  FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can create transfers" ON public.share_transfers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Admins can manage transfers" ON public.share_transfers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- BROKER COMMISSIONS TABLE
-- ============================================
CREATE TABLE public.broker_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  fixed_commission NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courtiers can view commissions" ON public.broker_commissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'courtier'));
CREATE POLICY "Admins can manage commissions" ON public.broker_commissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_broker_commissions_updated_at
  BEFORE UPDATE ON public.broker_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- BROKER SALES TABLE
-- ============================================
CREATE TABLE public.broker_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sale_price NUMERIC(15,2) NOT NULL,
  commission_earned NUMERIC(15,2) NOT NULL DEFAULT 0,
  sale_method TEXT DEFAULT 'platform',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courtiers can view own sales" ON public.broker_sales
  FOR SELECT TO authenticated USING (auth.uid() = broker_id);
CREATE POLICY "Admins can manage broker sales" ON public.broker_sales
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- BROKER OBJECTIVES TABLE
-- ============================================
CREATE TABLE public.broker_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  target_quantity INTEGER NOT NULL DEFAULT 0,
  target_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  deadline TIMESTAMP WITH TIME ZONE,
  description TEXT DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courtiers can view own objectives" ON public.broker_objectives
  FOR SELECT TO authenticated USING (auth.uid() = broker_id);
CREATE POLICY "Admins can manage objectives" ON public.broker_objectives
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_broker_objectives_updated_at
  BEFORE UPDATE ON public.broker_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Generate MSN ID function
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_msn_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_id := 'MSN-HC-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE msn_id = new_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- Auto-create profile and wallet on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, msn_id, first_name, last_name)
  VALUES (
    NEW.id,
    public.generate_msn_id(),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE: Company logos bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "Anyone can view company logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "Admins can upload company logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update company logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete company logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Generate order numbers function
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_num TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_num := 'MSN-HC-ORD-' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.user_shares WHERE order_number = new_num) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_num;
END;
$$ LANGUAGE plpgsql SET search_path = public;
