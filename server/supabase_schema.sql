-- ==============================================================================
-- DESY SALON & SPA - SUPABASE DATABASE SCHEMA & INITIAL DATA
-- Eksekusi script ini di Supabase SQL Editor:
-- Dashboard Supabase -> Project Anda -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Enable extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: categories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABEL: packages
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price BIGINT NOT NULL,
    original_price BIGINT,
    badge TEXT,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABEL: schedules (Booking & Reservasi)
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    package_name TEXT NOT NULL,
    event_date TEXT NOT NULL, -- format YYYY-MM-DD
    event_time TEXT,          -- format HH:mm
    whatsapp TEXT,
    session TEXT NOT NULL CHECK (session IN ('Pagi', 'Siang', 'Sore', 'Full Day')),
    location TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('Menunggu Konfirmasi', 'Terkonfirmasi', 'Menunggu DP', 'Lunas')) DEFAULT 'Menunggu Konfirmasi',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index untuk mempercepat query cek jadwal bentrok
CREATE INDEX IF NOT EXISTS idx_schedules_date_session ON public.schedules (event_date, session);

-- 5. TABEL: gallery (Portofolio)
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('Akad Nikah', 'Resepsi Adat', 'Wisuda & Pesta')),
    tag TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABEL: salon_profile
CREATE TABLE IF NOT EXISTS public.salon_profile (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    opening_hours TEXT NOT NULL,
    facebook TEXT,
    facebook_url TEXT,
    instagram TEXT,
    instagram_url TEXT,
    tiktok TEXT,
    tiktok_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. TABEL: admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Publik bisa membaca (SELECT) kategori, paket, galeri, jadwal, profil
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Public Read Schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Public Read Gallery" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Public Read Profile" ON public.salon_profile FOR SELECT USING (true);

-- Policy: Publik bisa membuat booking baru (INSERT jadwal)
CREATE POLICY "Public Insert Schedules" ON public.schedules FOR INSERT WITH CHECK (true);

-- Note: Karena Backend Express menggunakan Supabase Service Role Key, 
-- backend memiliki akses penuh (bypass RLS) untuk mutasi data admin secara aman.

-- ==============================================================================
-- STORAGE BUCKET: salon-assets
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('salon-assets', 'salon-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Assets" ON storage.objects 
FOR SELECT USING (bucket_id = 'salon-assets');

CREATE POLICY "Allow Upload Assets" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'salon-assets');

CREATE POLICY "Allow Update Assets" ON storage.objects 
FOR UPDATE USING (bucket_id = 'salon-assets');

CREATE POLICY "Allow Delete Assets" ON storage.objects 
FOR DELETE USING (bucket_id = 'salon-assets');

-- ==============================================================================
-- INITIAL SEED DATA (Data Asli dari desy-salon)
-- ==============================================================================

-- Kategori
INSERT INTO public.categories (id, name, slug) VALUES
('akad', 'Akad', 'akad'),
('resepsi', 'Resepsi', 'resepsi'),
('wisuda', 'Wisuda', 'wisuda'),
('perawatan', 'Perawatan', 'perawatan')
ON CONFLICT (id) DO NOTHING;

-- Paket
INSERT INTO public.packages (id, name, category, price, original_price, badge, image, description, features) VALUES
(
    'paket-akad', 'Akad Istimewa', 'Akad', 1850000, 2200000, 'Favorit',
    'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85',
    'Riasan anggun dan personal untuk momen sakral yang tak terlupakan.',
    '["Makeup akad premium", "Hijab do & aksesori", "Hairdo keluarga 1 orang", "Touch-up sebelum acara"]'::jsonb
),
(
    'paket-jawa', 'Paes Ageng Jawa', 'Resepsi', 4250000, 4800000, 'Best seller',
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85',
    'Tata rias tradisional dengan detail paes yang dibuat sepenuh hati.',
    '["Rias pengantin & paes", "Busana adat lengkap", "Melati & aksesori", "Rias orang tua 2 orang"]'::jsonb
),
(
    'paket-modern', 'Modern Grace', 'Resepsi', 3250000, NULL, NULL,
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    'Look modern yang ringan, tahan lama, dan tetap terasa seperti dirimu.',
    '["Makeup flawless premium", "Hairdo atau hijab styling", "Pilihan gaun resepsi", "Touch-up selama acara"]'::jsonb
),
(
    'paket-wisuda', 'Wisuda Cantik', 'Wisuda', 350000, NULL, NULL,
    'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85',
    'Riasan segar yang cantik di foto dari prosesi sampai perayaan.',
    '["Makeup natural glam", "Hairdo simpel", "Bulu mata premium", "Konsultasi look"]'::jsonb
),
(
    'paket-pra', 'Ritual Pra-Nikah', 'Perawatan', 650000, NULL, NULL,
    'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1000&q=85',
    'Waktu istimewa untuk merawat diri menjelang hari bahagiamu.',
    '["Facial calming", "Lulur & body mask", "Hair spa", "Teh herbal hangat"]'::jsonb
),
(
    'paket-akad-resepsi', 'Akad & Resepsi Lengkap', 'Akad', 5950000, 6800000, 'Hemat 12%',
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85',
    'Satu tim andal untuk menemani setiap babak hari pernikahanmu.',
    '["Rias akad & resepsi", "2 set busana pengantin", "Rias keluarga 4 orang", "Tim standby seharian"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Jadwal Awal
INSERT INTO public.schedules (id, client_name, package_name, event_date, event_time, session, location, notes, status) VALUES
('jadwal-1', 'Nadia Putri', 'Akad Istimewa', '2026-11-14', '08:00', 'Pagi', 'Gedung Serbaguna Melati', 'Makeup soft glam, kulit sensitif.', 'Terkonfirmasi'),
('jadwal-2', 'Aulia Rahma', 'Paes Ageng Jawa', '2026-11-14', '10:00', 'Pagi', 'Pendopo Taman Sari', 'Konsultasi busana hari Jumat.', 'Menunggu DP'),
('jadwal-3', 'Sinta Maharani', 'Modern Grace', '2026-11-21', '13:00', 'Siang', 'Hotel Aruna', '', 'Terkonfirmasi')
ON CONFLICT (id) DO NOTHING;

-- Portofolio Galeri
INSERT INTO public.gallery (id, title, event_type, tag, image_url, description) VALUES
('foto-1', 'Seruni di Pagi Akad', 'Akad Nikah', 'Soft glam', 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85', 'Riasan lembut dengan sentuhan rose untuk akad yang intim.'),
('foto-2', 'Paes Ageng Ningrat', 'Resepsi Adat', 'Adat Jawa', 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85', 'Detail tradisi Jawa yang dirangkai dengan penuh ketelitian.'),
('foto-3', 'A Day to Remember', 'Resepsi Adat', 'Modern', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85', 'Tampilan modern dan romantis untuk perayaan bersama keluarga.'),
('foto-4', 'Wisuda Penuh Cerita', 'Wisuda & Pesta', 'Natural', 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85', 'Natural glam yang terasa ringan untuk hari kelulusan.'),
('foto-5', 'Janji di Taman', 'Akad Nikah', 'Garden', 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85', 'Nuansa segar untuk pernikahan dengan suasana taman.'),
('foto-6', 'Malam yang Anggun', 'Resepsi Adat', 'Glam', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85', 'Riasan berkarakter untuk malam perayaan yang istimewa.')
ON CONFLICT (id) DO NOTHING;

-- Profil Salon
INSERT INTO public.salon_profile (id, name, tag, phone, address, opening_hours, facebook, facebook_url, instagram, instagram_url, tiktok, tiktok_url) VALUES
(
    'default',
    'Desy Salon',
    'Beauty for your beautiful beginning',
    '+62 821-3522-1177',
    'Jl. Desa Pekuncen No.15, RT 02/RW 03, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
    'Senin–Minggu, 08.00–17.00 WIB',
    'Desyana',
    'https://www.facebook.com/desyana',
    '@desyana_77',
    'https://www.instagram.com/desyana_77/',
    '@desyana.s',
    'https://www.tiktok.com/@desyana.s'
)
ON CONFLICT (id) DO NOTHING;

