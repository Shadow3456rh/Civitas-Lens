-- Add full_name and phone columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Update trigger function to populate these fields on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    new.id, 
    'citizen',
    new.raw_user_meta_data->>'full_name',
    new.phone
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone
  WHERE public.profiles.full_name IS NULL OR public.profiles.phone IS NULL;
  RETURN new;
END;
$$;
