-- Create media type enum
CREATE TYPE public.company_media_type AS ENUM ('logo', 'banner', 'photo', 'video');

-- Create company_media table
CREATE TABLE public.company_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type public.company_media_type NOT NULL DEFAULT 'photo',
  caption TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast retrieval per company
CREATE INDEX idx_company_media_company ON public.company_media(company_id, display_order);

-- Enable RLS
ALTER TABLE public.company_media ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view media of active companies
CREATE POLICY "Anyone authenticated can view company media"
  ON public.company_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_media.company_id
        AND (c.is_active = true 
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'gestionnaire_entreprises'::app_role))
    )
  );

-- Admin and gestionnaire_entreprises can insert
CREATE POLICY "Admins and gestionnaires can add media"
  ON public.company_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestionnaire_entreprises'::app_role)
  );

-- Admin and gestionnaire_entreprises can update
CREATE POLICY "Admins and gestionnaires can update media"
  ON public.company_media
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestionnaire_entreprises'::app_role)
  );

-- Admin and gestionnaire_entreprises can delete
CREATE POLICY "Admins and gestionnaires can delete media"
  ON public.company_media
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestionnaire_entreprises'::app_role)
  );