-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    shop_name TEXT,
    role TEXT DEFAULT 'shop_owner' CHECK (role IN ('admin', 'shop_owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profiles." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mobile_number TEXT NOT NULL,
    name TEXT,
    balance DECIMAL(12, 2) DEFAULT 0,
    total_saved DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(shop_owner_id, mobile_number)
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customers Policies
CREATE POLICY "Shop owners can view their own customers." ON public.customers
    FOR SELECT USING (auth.uid() = shop_owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Shop owners can insert their own customers." ON public.customers
    FOR INSERT WITH CHECK (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can update their own customers." ON public.customers
    FOR UPDATE USING (auth.uid() = shop_owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Shop owners can delete their own customers." ON public.customers
    FOR DELETE USING (auth.uid() = shop_owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    shop_owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount DECIMAL(12, 2) NOT NULL, -- The balance change
    paid_amount DECIMAL(12, 2) DEFAULT 0, -- Actual cash paid (for deposits)
    saved_amount DECIMAL(12, 2) DEFAULT 0, -- Amount saved (for withdrawals)
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions Policies
CREATE POLICY "Shop owners can view their own transactions." ON public.transactions
    FOR SELECT USING (auth.uid() = shop_owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Shop owners can insert transactions for their customers." ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = shop_owner_id);

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, shop_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'shop_name',
    COALESCE(new.raw_user_meta_data->>'role', 'shop_owner')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
