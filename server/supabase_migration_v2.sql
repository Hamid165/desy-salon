-- ==============================================================================
-- DESY SALON & SPA - SUPABASE MIGRATION V2 (FAQ, Certificates, price_max, maps_url)
-- Eksekusi file ini di Supabase SQL Editor:
-- Dashboard Supabase -> Project Anda -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Tambah kolom price_max pada tabel packages (untuk rentang harga)
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS price_max BIGINT;

-- Update paket lama dengan nilai price_max
UPDATE public.packages SET price_max = 2500000 WHERE id = 'paket-akad';
UPDATE public.packages SET price_max = 5500000 WHERE id = 'paket-jawa';
UPDATE public.packages SET price_max = 4500000 WHERE id = 'paket-modern';
UPDATE public.packages SET price_max = 650000 WHERE id = 'paket-wisuda';
UPDATE public.packages SET price_max = 7500000 WHERE id = 'paket-akad-resepsi';

-- 2. Tambah kolom maps_url pada tabel salon_profile
ALTER TABLE public.salon_profile ADD COLUMN IF NOT EXISTS maps_url TEXT;

UPDATE public.salon_profile 
SET maps_url = 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9' 
WHERE id = 'default';

-- 3. TABEL: certificates (Sertifikat Pelatihan & Penghargaan)
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS untuk certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Certificates' AND tablename = 'certificates') THEN
        CREATE POLICY "Public Read Certificates" ON public.certificates FOR SELECT USING (true);
    END IF;
END $$;

-- 4. TABEL: faqs (Pertanyaan yang Sering Diajukan)
CREATE TABLE IF NOT EXISTS public.faqs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs (category);

-- RLS untuk faqs
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read FAQs' AND tablename = 'faqs') THEN
        CREATE POLICY "Public Read FAQs" ON public.faqs FOR SELECT USING (true);
    END IF;
END $$;

-- 5. SEED DATA: FAQs
INSERT INTO public.faqs (id, category, question, answer) VALUES
(
    'faq-rias-1',
    'Tata Rias',
    'Apakah saya harus melakukan reservasi sebelum datang ke Desy Salon?',
    'Untuk layanan tata rias pengantin (wedding) dan makeup acara khusus, wajib melakukan reservasi jauh-jauh hari untuk mengamankan jadwal. Sedangkan untuk perawatan salon Anda bisa datang langsung, namun reservasi lebih dianjurkan agar tidak perlu mengantre.'
),
(
    'faq-rias-2',
    'Tata Rias',
    'Layanan apa saja yang tersedia di Desy Salon?',
    'Fokus utama kami adalah tata rias pengantin terutama Adat Jawa, makeup wisuda, makeup engagement, makeup prewedding dan makeup pesta lainnya. Selain itu, kami juga menyediakan layanan salon reguler seperti potong rambut, facial, creambath, pewarnaan, smoothing, perawatan rambut dan lainnya.'
),
(
    'faq-rias-3',
    'Tata Rias',
    'Bolehkah saya meminta layanan test makeup sebelum hari pernikahan?',
    'Bisa, kami menyediakan opsi test makeup dengan biaya tersendiri. Layanan ini sangat disarankan jika ingin melihat langsung kecocokan gaya riasan di wajah Anda sebelum hari H.'
),
(
    'faq-rias-4',
    'Tata Rias',
    'Apakah ada sesi fitting busana pengantin sebelum hari H?',
    'Ya, kami selalu menjadwalkan sesi fitting busana secara khusus di salon sebelum hari pernikahan. Hal ini untuk memastikan ukuran, kenyamanan, dan model pakaian sudah benar-benar sesuai dengan bentuk tubuh dan keinginan Anda.'
),
(
    'faq-rias-5',
    'Tata Rias',
    'Adakah ada pilihan Model Hair do dan Hijab do?',
    'Ya, kami bisa menyediakan pilihan Model Hair do dan Hijab do yang diinginkan, dimulai dari Sanggul Jawa, Sanggul Modern, dan Model Hijab kekinian sesuai dengan referensi Anda.'
),
(
    'faq-rias-6',
    'Tata Rias',
    'Apakah Desy Salon melayani panggilan tata rias (home service) ke lokasi acara?',
    'Ya, tim kami melayani panggilan tata rias langsung ke rumah atau gedung tempat acara Anda berlangsung. Silakan komunikasikan lokasi acara di awal agar kami dapat menginformasikan penyesuaian biaya transportasinya.'
),
(
    'faq-rias-7',
    'Tata Rias',
    'Bagaimana sistem pembayaran paket pengantin?',
    'Jadwal Anda akan resmi terkunci (booking) setelah melakukan pembayaran uang muka (DP) 25%. Sisa pelunasan biasanya dibayarkan pada H-3 atau sesuai dengan kesepakatan bersama saat penandatanganan kuitansi.'
),
(
    'faq-rias-8',
    'Tata Rias',
    'Apakah saya bisa mengubah tanggal acara atau membatalkan pesanan?',
    'Perubahan tanggal (reschedule) dapat dilakukan selama jadwal baru yang Anda minta masih kosong. Namun, untuk pembatalan sepihak, uang muka (DP) tidak dapat dikembalikan. Silakan hubungi melalui WhatsApp untuk detail syarat dan ketentuan lebih lanjut.'
),
(
    'faq-salon-1',
    'Layanan Salon',
    'Masih bingung menentukan potongan rambut?',
    'Kirim referensi potongan dan ceritakan dengan detail rambut Anda melalui WhatsApp. Kami dapat membantu membahas pilihan layanan sebelum kunjungan.'
),
(
    'faq-salon-2',
    'Layanan Salon',
    'Masih bingung menentukan warna rambut?',
    'Kirim referensi warna dan ceritakan riwayat pewarnaan rambut Anda melalui WhatsApp. Kami dapat melakukan tes sensitive kulit terlebih dahulu.'
),
(
    'faq-salon-3',
    'Layanan Salon',
    'Apakah melayani potong rambut untuk pria dan anak-anak?',
    'Tentu saja, layanan potong rambut di Desy Salon terbuka untuk wanita, pria, maupun anak-anak.'
),
(
    'faq-salon-4',
    'Layanan Salon',
    'Berapa lama estimasi waktu untuk proses smoothing atau pewarnaan?',
    'Durasi pengerjaan bervariasi tergantung panjang dan ketebalan rambut Anda, namun sebaiknya menceritakan kondisi rambut Anda terlebih dahulu, umumnya memakan waktu antara 2 hingga 4 jam.'
),
(
    'faq-salon-5',
    'Layanan Salon',
    'Apakah ada perawatan khusus untuk rambut rusak atau rontok?',
    'Ya, kami menyediakan pilihan creambath, hair spa, dan masker rambut khusus untuk merawat rambut kering, berminyak, rusak, atau mudah rontok. Dengan berbagai formulated vitamin pilihan.'
),
(
    'faq-salon-6',
    'Layanan Salon',
    'Apakah ada pilihan nail art?',
    'Ya, kami menyediakan pilihan dan referensi yang Anda inginkan.'
),
(
    'faq-salon-7',
    'Layanan Salon',
    'Apakah ada perawatan wajah atau facial?',
    'Ya, konsultasikan keluhan kulit wajah Anda agar tim kami dapat memberikan saran dan masukkan apa saja yang dapat dilakukan perawatan pada wajah Anda.'
),
(
    'faq-salon-8',
    'Layanan Salon',
    'Apakah produk yang digunakan aman untuk kulit kepala sensitif?',
    'Kami menggunakan produk salon berkualitas dan standar profesional. Namun, jika Anda memiliki riwayat alergi atau kulit kepala sensitif, mohon informasikan kepada tim kami sebelum treatment dimulai.'
),
(
    'faq-salon-9',
    'Layanan Salon',
    'Apakah ada perawatan badan atau lulur body?',
    'Ya, perawatan badan yang memberikan kerileksan (relaksi) pada tubuh Anda. Disarankan reservasi terlebih dahulu.'
),
(
    'faq-salon-10',
    'Layanan Salon',
    'Bisa menanyakan total biaya Salon dulu?',
    'Bisa. Sebutkan treatment atau kombinasi layanan yang diinginkan supaya tim kami dapat membantu menjelaskan biayanya.'
)
ON CONFLICT (id) DO NOTHING;

-- 6. MIGRASI 2 KATEGORI: Salon & Tata Rias
-- Menyesuaikan kategori di tabel categories & packages ke 2 kategori utama: Salon dan Tata Rias

-- A. Masukkan 2 kategori utama (Salon & Tata Rias)
INSERT INTO public.categories (id, name, slug) VALUES
('salon', 'Salon', 'salon'),
('tata-rias', 'Tata Rias', 'tata-rias')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- B. Update paket yang ada ke kategori baru
UPDATE public.packages 
SET category = 'Tata Rias' 
WHERE category IN ('Akad', 'Resepsi', 'Wisuda', 'tata-rias', 'Tata rias');

UPDATE public.packages 
SET category = 'Salon' 
WHERE category IN ('Perawatan', 'Treatment', 'salon', 'Perawatan Salon');

-- C. Hapus kategori lama yang sudah tidak dipakai
DELETE FROM public.categories 
WHERE id NOT IN ('salon', 'tata-rias');

-- D. Lepas batasan check event_type pada tabel gallery agar fleksibel
ALTER TABLE public.gallery DROP CONSTRAINT IF EXISTS gallery_event_type_check;

-- 7. MIGRASI STATUS BOOKING: Menunggu Konfirmasi, DP, Lunas, Selesai
UPDATE public.schedules SET status = 'DP' WHERE status = 'Terkonfirmasi';
UPDATE public.schedules SET status = 'Menunggu Konfirmasi' WHERE status = 'Menunggu DP';

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check 
    CHECK (status IN ('Menunggu Konfirmasi', 'DP', 'Lunas', 'Selesai'));

-- 8. HAPUS / SET NULL KOLOM original_price & badge PADA PACKAGES
UPDATE public.packages SET original_price = NULL, badge = NULL;
ALTER TABLE public.packages DROP COLUMN IF EXISTS original_price;
ALTER TABLE public.packages DROP COLUMN IF EXISTS badge;


