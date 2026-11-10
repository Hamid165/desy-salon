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
    price_max BIGINT,
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
    status TEXT NOT NULL CHECK (status IN ('Menunggu Konfirmasi', 'DP', 'Lunas', 'Selesai')) DEFAULT 'Menunggu Konfirmasi',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index untuk mempercepat query cek jadwal bentrok
CREATE INDEX IF NOT EXISTS idx_schedules_date_session ON public.schedules (event_date, session);

-- 5. TABEL: gallery (Portofolio)
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL,
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
    maps_url TEXT,
    opening_hours TEXT NOT NULL,
    facebook TEXT,
    facebook_url TEXT,
    instagram TEXT,
    instagram_url TEXT,
    tiktok TEXT,
    tiktok_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. TABEL: certificates
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. TABEL: faqs
CREATE TABLE IF NOT EXISTS public.faqs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs (category);

-- 9. TABEL: admin_users
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
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Publik bisa membaca (SELECT) kategori, paket, galeri, jadwal, profil, sertifikat, faqs
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Public Read Schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Public Read Gallery" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Public Read Profile" ON public.salon_profile FOR SELECT USING (true);
CREATE POLICY "Public Read Certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Public Read FAQs" ON public.faqs FOR SELECT USING (true);

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
('salon', 'Salon', 'salon'),
('tata-rias', 'Tata Rias', 'tata-rias')
ON CONFLICT (id) DO NOTHING;

-- Paket
INSERT INTO public.packages (id, name, category, price, price_max, image, description, features) VALUES
(
    'paket-akad', 'Akad Istimewa', 'Tata Rias', 1850000, 2500000,
    'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85',
    'Riasan anggun dan personal untuk momen sakral yang tak terlupakan.',
    '["Makeup akad premium", "Hijab do & aksesori", "Hairdo keluarga 1 orang", "Touch-up sebelum acara"]'::jsonb
),
(
    'paket-jawa', 'Paes Ageng Jawa', 'Tata Rias', 4250000, 5500000,
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85',
    'Tata rias tradisional dengan detail paes yang dibuat sepenuh hati.',
    '["Rias pengantin & paes", "Busana adat lengkap", "Melati & aksesori", "Rias orang tua 2 orang"]'::jsonb
),
(
    'paket-modern', 'Modern Grace', 'Tata Rias', 3250000, 4500000,
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    'Look modern yang ringan, tahan lama, dan tetap terasa seperti dirimu.',
    '["Makeup flawless premium", "Hairdo atau hijab styling", "Pilihan gaun resepsi", "Touch-up selama acara"]'::jsonb
),
(
    'paket-wisuda', 'Wisuda Cantik', 'Tata Rias', 350000, 650000,
    'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85',
    'Riasan segar yang cantik di foto dari prosesi sampai perayaan.',
    '["Makeup natural glam", "Hairdo simpel", "Bulu mata premium", "Konsultasi look"]'::jsonb
),
(
    'paket-pra', 'Ritual Pra-Nikah', 'Salon', 650000, NULL,
    'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1000&q=85',
    'Waktu istimewa untuk merawat diri menjelang hari bahagiamu.',
    '["Facial calming", "Lulur & body mask", "Hair spa", "Teh herbal hangat"]'::jsonb
),
(
    'paket-akad-resepsi', 'Akad & Resepsi Lengkap', 'Tata Rias', 5950000, 7500000,
    'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85',
    'Satu tim andal untuk menemani setiap babak hari pernikahanmu.',
    '["Rias akad & resepsi", "2 set busana pengantin", "Rias keluarga 4 orang", "Tim standby seharian"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Jadwal Awal
INSERT INTO public.schedules (id, client_name, package_name, event_date, event_time, session, location, notes, status) VALUES
('jadwal-1', 'Nadia Putri', 'Akad Istimewa', '2026-11-14', '08:00', 'Pagi', 'Gedung Serbaguna Melati', 'Makeup soft glam, kulit sensitif.', 'DP'),
('jadwal-2', 'Aulia Rahma', 'Paes Ageng Jawa', '2026-11-14', '10:00', 'Pagi', 'Pendopo Taman Sari', 'Konsultasi busana hari Jumat.', 'Menunggu Konfirmasi'),
('jadwal-3', 'Sinta Maharani', 'Modern Grace', '2026-11-21', '13:00', 'Siang', 'Hotel Aruna', '', 'DP')
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
INSERT INTO public.salon_profile (id, name, tag, phone, address, maps_url, opening_hours, facebook, facebook_url, instagram, instagram_url, tiktok, tiktok_url) VALUES
(
    'default',
    'Desy Salon',
    'Beauty for your beautiful beginning',
    '+62 821-3522-1177',
    'Jl. Desa Pekuncen No.15, RT 02/RW 03, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
    'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9',
    'Senin–Minggu, 08.00–17.00 WIB',
    'Desyana',
    'https://www.facebook.com/desyana',
    '@desyana_77',
    'https://www.instagram.com/desyana_77/',
    '@desyana.s',
    'https://www.tiktok.com/@desyana.s'
)
ON CONFLICT (id) DO NOTHING;

-- FAQs Awal
INSERT INTO public.faqs (id, category, question, answer) VALUES
('faq-rias-1', 'Tata Rias', 'Apakah saya harus melakukan reservasi sebelum datang ke Desy Salon?', 'Untuk layanan tata rias pengantin (wedding) dan makeup acara khusus, wajib melakukan reservasi jauh-jauh hari untuk mengamankan jadwal. Sedangkan untuk perawatan salon Anda bisa datang langsung, namun reservasi lebih dianjurkan agar tidak perlu mengantre.'),
('faq-rias-2', 'Tata Rias', 'Layanan apa saja yang tersedia di Desy Salon?', 'Fokus utama kami adalah tata rias pengantin terutama Adat Jawa, makeup wisuda, makeup engagement, makeup prewedding dan makeup pesta lainnya. Selain itu, kami juga menyediakan layanan salon reguler seperti potong rambut, facial, creambath, pewarnaan, smoothing, perawatan rambut dan lainnya.'),
('faq-rias-3', 'Tata Rias', 'Bolehkah saya meminta layanan test makeup sebelum hari pernikahan?', 'Bisa, kami menyediakan opsi test makeup dengan biaya tersendiri. Layanan ini sangat disarankan jika ingin melihat langsung kecocokan gaya riasan di wajah Anda sebelum hari H.'),
('faq-rias-4', 'Tata Rias', 'Apakah ada sesi fitting busana pengantin sebelum hari H?', 'Ya, kami selalu menjadwalkan sesi fitting busana secara khusus di salon sebelum hari pernikahan. Hal ini untuk memastikan ukuran, kenyamanan, dan model pakaian sudah benar-benar sesuai dengan bentuk tubuh dan keinginan Anda.'),
('faq-rias-5', 'Tata Rias', 'Adakah ada pilihan Model Hair do dan Hijab do?', 'Ya, kami bisa menyediakan pilihan Model Hair do dan Hijab do yang diinginkan, dimulai dari Sanggul Jawa, Sanggul Modern, dan Model Hijab kekinian sesuai dengan referensi Anda.'),
('faq-rias-6', 'Tata Rias', 'Apakah Desy Salon melayani panggilan tata rias (home service) ke lokasi acara?', 'Ya, tim kami melayani panggilan tata rias langsung ke rumah atau gedung tempat acara Anda berlangsung. Silakan komunikasikan lokasi acara di awal agar kami dapat menginformasikan penyesuaian biaya transportasinya.'),
('faq-rias-7', 'Tata Rias', 'Bagaimana sistem pembayaran paket pengantin?', 'Jadwal Anda akan resmi terkunci (booking) setelah melakukan pembayaran uang muka (DP) 25%. Sisa pelunasan biasanya dibayarkan pada H-3 atau sesuai dengan kesepakatan bersama saat penandatanganan kuitansi.'),
('faq-rias-8', 'Tata Rias', 'Apakah saya bisa mengubah tanggal acara atau membatalkan pesanan?', 'Perubahan tanggal (reschedule) dapat dilakukan selama jadwal baru yang Anda minta masih kosong. Namun, untuk pembatalan sepihak, uang muka (DP) tidak dapat dikembalikan. Silakan hubungi melalui WhatsApp untuk detail syarat dan ketentuan lebih lanjut.'),
('faq-salon-1', 'Layanan Salon', 'Masih bingung menentukan potongan rambut?', 'Kirim referensi potongan dan ceritakan dengan detail rambut Anda melalui WhatsApp. Kami dapat membantu membahas pilihan layanan sebelum kunjungan.'),
('faq-salon-2', 'Layanan Salon', 'Masih bingung menentukan warna rambut?', 'Kirim referensi warna dan ceritakan riwayat pewarnaan rambut Anda melalui WhatsApp. Kami dapat melakukan tes sensitive kulit terlebih dahulu.'),
('faq-salon-3', 'Layanan Salon', 'Apakah melayani potong rambut untuk pria dan anak-anak?', 'Tentu saja, layanan potong rambut di Desy Salon terbuka untuk wanita, pria, maupun anak-anak.'),
('faq-salon-4', 'Layanan Salon', 'Berapa lama estimasi waktu untuk proses smoothing atau pewarnaan?', 'Durasi pengerjaan bervariasi tergantung panjang dan ketebalan rambut Anda, namun sebaiknya menceritakan kondisi rambut Anda terlebih dahulu, umumnya memakan waktu antara 2 hingga 4 jam.'),
('faq-salon-5', 'Layanan Salon', 'Apakah ada perawatan khusus untuk rambut rusak atau rontok?', 'Ya, kami menyediakan pilihan creambath, hair spa, dan masker rambut khusus untuk merawat rambut kering, berminyak, rusak, atau mudah rontok. Dengan berbagai formulated vitamin pilihan.'),
('faq-salon-6', 'Layanan Salon', 'Apakah ada pilihan nail art?', 'Ya, kami menyediakan pilihan dan referensi yang Anda inginkan.'),
('faq-salon-7', 'Layanan Salon', 'Apakah ada perawatan wajah atau facial?', 'Ya, konsultasikan keluhan kulit wajah Anda agar tim kami dapat memberikan saran dan masukkan apa saja yang dapat dilakukan perawatan pada wajah Anda.'),
('faq-salon-8', 'Layanan Salon', 'Apakah produk yang digunakan aman untuk kulit kepala sensitif?', 'Kami menggunakan produk salon berkualitas dan standar profesional. Namun, jika Anda memiliki riwayat alergi atau kulit kepala sensitif, mohon informasikan kepada tim kami sebelum treatment dimulai.'),
('faq-salon-9', 'Layanan Salon', 'Apakah ada perawatan badan atau lulur body?', 'Ya, perawatan badan yang memberikan kerileksan (relaksi) pada tubuh Anda. Disarankan reservasi terlebih dahulu.'),
('faq-salon-10', 'Layanan Salon', 'Bisa menanyakan total biaya Salon dulu?', 'Bisa. Sebutkan treatment atau kombinasi layanan yang diinginkan supaya tim kami dapat membantu menjelaskan biayanya.')
ON CONFLICT (id) DO NOTHING;

