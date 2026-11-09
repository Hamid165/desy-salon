import type { SalonStore } from './types'
import cert1 from './assets/sertfikat-desy-salon-1.jpg'
import cert2 from './assets/sertfikat-desy-salon-2.jpg'
import cert3 from './assets/sertfikat-desy-salon-3.jpg'
import cert4 from './assets/sertfikat-desy-salon-4.jpg'
import cert5 from './assets/sertfikat-desy-salon-5.jpg'
import cert6 from './assets/sertfikat-desy-salon-6.jpg'

export const initialStore: SalonStore = {
  categories: [
    { id: 'akad', name: 'Akad', slug: 'akad' },
    { id: 'resepsi', name: 'Resepsi', slug: 'resepsi' },
    { id: 'wisuda', name: 'Wisuda', slug: 'wisuda' },
    { id: 'perawatan', name: 'Perawatan', slug: 'perawatan' },
  ],
  packages: [
    {
      id: 'paket-akad', name: 'Akad Istimewa', category: 'Akad', price: 1850000, priceMax: 2500000, originalPrice: 2200000,
      badge: 'Favorit', image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85',
      description: 'Riasan anggun dan personal untuk momen sakral yang tak terlupakan.',
      features: ['Makeup akad premium', 'Hijab do & aksesori', 'Hairdo keluarga 1 orang', 'Touch-up sebelum acara'],
    },
    {
      id: 'paket-jawa', name: 'Paes Ageng Jawa', category: 'Resepsi', price: 4250000, priceMax: 5500000, originalPrice: 4800000,
      badge: 'Best seller', image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85',
      description: 'Tata rias tradisional dengan detail paes yang dibuat sepenuh hati.',
      features: ['Rias pengantin & paes', 'Busana adat lengkap', 'Melati & aksesori', 'Rias orang tua 2 orang'],
    },
    {
      id: 'paket-modern', name: 'Modern Grace', category: 'Resepsi', price: 3250000, priceMax: 4500000,
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
      description: 'Look modern yang ringan, tahan lama, dan tetap terasa seperti dirimu.',
      features: ['Makeup flawless premium', 'Hairdo atau hijab styling', 'Pilihan gaun resepsi', 'Touch-up selama acara'],
    },
    {
      id: 'paket-wisuda', name: 'Wisuda Cantik', category: 'Wisuda', price: 350000, priceMax: 650000,
      image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85',
      description: 'Riasan segar yang cantik di foto dari prosesi sampai perayaan.',
      features: ['Makeup natural glam', 'Hairdo simpel', 'Bulu mata premium', 'Konsultasi look'],
    },
    {
      id: 'paket-pra', name: 'Ritual Pra-Nikah', category: 'Perawatan', price: 650000,
      image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1000&q=85',
      description: 'Waktu istimewa untuk merawat diri menjelang hari bahagiamu.',
      features: ['Facial calming', 'Lulur & body mask', 'Hair spa', 'Teh herbal hangat'],
    },
    {
      id: 'paket-akad-resepsi', name: 'Akad & Resepsi Lengkap', category: 'Akad', price: 5950000, priceMax: 7500000, originalPrice: 6800000,
      badge: 'Hemat 12%', image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85',
      description: 'Satu tim andal untuk menemani setiap babak hari pernikahanmu.',
      features: ['Rias akad & resepsi', '2 set busana pengantin', 'Rias keluarga 4 orang', 'Tim standby seharian'],
    },
  ],
  schedules: [
    { id: 'jadwal-1', clientName: 'Nadia Putri', packageName: 'Akad Istimewa', eventDate: '2026-11-14', eventTime: '08:00', session: 'Pagi', location: 'Gedung Serbaguna Melati', notes: 'Makeup soft glam, kulit sensitif.', status: 'Terkonfirmasi' },
    { id: 'jadwal-2', clientName: 'Aulia Rahma', packageName: 'Paes Ageng Jawa', eventDate: '2026-11-14', eventTime: '10:00', session: 'Pagi', location: 'Pendopo Taman Sari', notes: 'Konsultasi busana hari Jumat.', status: 'Menunggu DP' },
    { id: 'jadwal-3', clientName: 'Sinta Maharani', packageName: 'Modern Grace', eventDate: '2026-11-21', eventTime: '13:00', session: 'Siang', location: 'Hotel Aruna', notes: '', status: 'Terkonfirmasi' },
    { id: 'jadwal-4', clientName: 'Dewi Lestari', packageName: 'Akad & Resepsi Lengkap', eventDate: '2026-10-25', eventTime: '07:30', session: 'Pagi', location: 'Balai Desa Pekuncen', notes: 'Riasan paes ageng & touch up seharian.', status: 'Lunas' },
    { id: 'jadwal-5', clientName: 'Fitri Handayani', packageName: 'Wisuda Cantik', eventDate: '2026-10-18', eventTime: '06:00', session: 'Pagi', location: 'Studio Desy Salon', notes: 'Makeup natural wisuda pagi.', status: 'Lunas' },
    { id: 'jadwal-6', clientName: 'Ratna Kusuma', packageName: 'Paes Ageng Jawa', eventDate: '2026-09-28', eventTime: '09:00', session: 'Pagi', location: 'Gedung Kesenian Banyumas', notes: 'Acara adat Jawa lengkap keluarga.', status: 'Lunas' },
  ],
  gallery: [
    { id: 'foto-1', title: 'Seruni di Pagi Akad', category: 'Akad', eventType: 'Akad Nikah', tag: 'Soft glam', imageUrl: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85', description: 'Riasan lembut dengan sentuhan rose untuk akad yang intim.' },
    { id: 'foto-2', title: 'Paes Ageng Ningrat', category: 'Resepsi', eventType: 'Resepsi Adat', tag: 'Adat Jawa', imageUrl: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85', description: 'Detail tradisi Jawa yang dirangkai dengan penuh ketelitian.' },
    { id: 'foto-3', title: 'A Day to Remember', category: 'Resepsi', eventType: 'Resepsi Adat', tag: 'Modern', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85', description: 'Tampilan modern dan romantis untuk perayaan bersama keluarga.' },
    { id: 'foto-4', title: 'Wisuda Penuh Cerita', category: 'Wisuda', eventType: 'Wisuda & Pesta', tag: 'Natural', imageUrl: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85', description: 'Natural glam yang terasa ringan untuk hari kelulusan.' },
    { id: 'foto-5', title: 'Janji di Taman', category: 'Akad', eventType: 'Akad Nikah', tag: 'Garden', imageUrl: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85', description: 'Nuansa segar untuk pernikahan dengan suasana taman.' },
    { id: 'foto-6', title: 'Malam yang Anggun', category: 'Resepsi', eventType: 'Resepsi Adat', tag: 'Glam', imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85', description: 'Riasan berkarakter untuk malam perayaan yang istimewa.' },
  ],
  certificates: [
    { id: 'sertifikat-1', imageUrl: cert1, title: 'Sertifikat 1' },
    { id: 'sertifikat-2', imageUrl: cert2, title: 'Sertifikat 2' },
    { id: 'sertifikat-3', imageUrl: cert3, title: 'Sertifikat 3' },
    { id: 'sertifikat-4', imageUrl: cert4, title: 'Sertifikat 4' },
    { id: 'sertifikat-5', imageUrl: cert5, title: 'Sertifikat 5' },
    { id: 'sertifikat-6', imageUrl: cert6, title: 'Sertifikat 6' },
  ],
  faqs: [
    {
      id: 'faq-rias-1',
      category: 'Tata Rias',
      question: 'Apakah saya harus melakukan reservasi sebelum datang ke Desy Salon?',
      answer: 'Untuk layanan tata rias pengantin (wedding) dan makeup acara khusus, wajib melakukan reservasi jauh-jauh hari untuk mengamankan jadwal. Sedangkan untuk perawatan salon Anda bisa datang langsung, namun reservasi lebih dianjurkan agar tidak perlu mengantre.',
    },
    {
      id: 'faq-rias-2',
      category: 'Tata Rias',
      question: 'Layanan apa saja yang tersedia di Desy Salon?',
      answer: 'Fokus utama kami adalah tata rias pengantin terutama Adat Jawa, makeup wisuda, makeup engagement, makeup prewedding dan makeup pesta lainnya. Selain itu, kami juga menyediakan layanan salon reguler seperti potong rambut, facial, creambath, pewarnaan, smoothing, perawatan rambut dan lainnya.',
    },
    {
      id: 'faq-rias-3',
      category: 'Tata Rias',
      question: 'Bolehkah saya meminta layanan test makeup sebelum hari pernikahan?',
      answer: 'Bisa, kami menyediakan opsi test makeup dengan biaya tersendiri. Layanan ini sangat disarankan jika ingin melihat langsung kecocokan gaya riasan di wajah Anda sebelum hari H.',
    },
    {
      id: 'faq-rias-4',
      category: 'Tata Rias',
      question: 'Apakah ada sesi fitting busana pengantin sebelum hari H?',
      answer: 'Ya, kami selalu menjadwalkan sesi fitting busana secara khusus di salon sebelum hari pernikahan. Hal ini untuk memastikan ukuran, kenyamanan, dan model pakaian sudah benar-benar sesuai dengan bentuk tubuh dan keinginan Anda.',
    },
    {
      id: 'faq-rias-5',
      category: 'Tata Rias',
      question: 'Adakah ada pilihan Model Hair do dan Hijab do?',
      answer: 'Ya, kami bisa menyediakan pilihan Model Hair do dan Hijab do yang diinginkan, dimulai dari Sanggul Jawa, Sanggul Modern, dan Model Hijab kekinian sesuai dengan referensi Anda.',
    },
    {
      id: 'faq-rias-6',
      category: 'Tata Rias',
      question: 'Apakah Desy Salon melayani panggilan tata rias (home service) ke lokasi acara?',
      answer: 'Ya, tim kami melayani panggilan tata rias langsung ke rumah atau gedung tempat acara Anda berlangsung. Silakan komunikasikan lokasi acara di awal agar kami dapat menginformasikan penyesuaian biaya transportasinya.',
    },
    {
      id: 'faq-rias-7',
      category: 'Tata Rias',
      question: 'Bagaimana sistem pembayaran paket pengantin?',
      answer: 'Jadwal Anda akan resmi terkunci (booking) setelah melakukan pembayaran uang muka (DP) 25%. Sisa pelunasan biasanya dibayarkan pada H-3 atau sesuai dengan kesepakatan bersama saat penandatanganan kuitansi.',
    },
    {
      id: 'faq-rias-8',
      category: 'Tata Rias',
      question: 'Apakah saya bisa mengubah tanggal acara atau membatalkan pesanan?',
      answer: 'Perubahan tanggal (reschedule) dapat dilakukan selama jadwal baru yang Anda minta masih kosong. Namun, untuk pembatalan sepihak, uang muka (DP) tidak dapat dikembalikan. Silakan hubungi melalui WhatsApp untuk detail syarat dan ketentuan lebih lanjut.',
    },
    {
      id: 'faq-salon-1',
      category: 'Layanan Salon',
      question: 'Masih bingung menentukan potongan rambut?',
      answer: 'Kirim referensi potongan dan ceritakan dengan detail rambut Anda melalui WhatsApp. Kami dapat membantu membahas pilihan layanan sebelum kunjungan.',
    },
    {
      id: 'faq-salon-2',
      category: 'Layanan Salon',
      question: 'Masih bingung menentukan warna rambut?',
      answer: 'Kirim referensi warna dan ceritakan riwayat pewarnaan rambut Anda melalui WhatsApp. Kami dapat melakukan tes sensitive kulit terlebih dahulu.',
    },
    {
      id: 'faq-salon-3',
      category: 'Layanan Salon',
      question: 'Apakah melayani potong rambut untuk pria dan anak-anak?',
      answer: 'Tentu saja, layanan potong rambut di Desy Salon terbuka untuk wanita, pria, maupun anak-anak.',
    },
    {
      id: 'faq-salon-4',
      category: 'Layanan Salon',
      question: 'Berapa lama estimasi waktu untuk proses smoothing atau pewarnaan?',
      answer: 'Durasi pengerjaan bervariasi tergantung panjang dan ketebalan rambut Anda, namun sebaiknya menceritakan kondisi rambut Anda terlebih dahulu, umumnya memakan waktu antara 2 hingga 4 jam.',
    },
    {
      id: 'faq-salon-5',
      category: 'Layanan Salon',
      question: 'Apakah ada perawatan khusus untuk rambut rusak atau rontok?',
      answer: 'Ya, kami menyediakan pilihan creambath, hair spa, dan masker rambut khusus untuk merawat rambut kering, berminyak, rusak, atau mudah rontok. Dengan berbagai formulated vitamin pilihan.',
    },
    {
      id: 'faq-salon-6',
      category: 'Layanan Salon',
      question: 'Apakah ada pilihan nail art?',
      answer: 'Ya, kami menyediakan pilihan dan referensi yang Anda inginkan.',
    },
    {
      id: 'faq-salon-7',
      category: 'Layanan Salon',
      question: 'Apakah ada perawatan wajah atau facial?',
      answer: 'Ya, konsultasikan keluhan kulit wajah Anda agar tim kami dapat memberikan saran dan masukkan apa saja yang dapat dilakukan perawatan pada wajah Anda.',
    },
    {
      id: 'faq-salon-8',
      category: 'Layanan Salon',
      question: 'Apakah produk yang digunakan aman untuk kulit kepala sensitif?',
      answer: 'Kami menggunakan produk salon berkualitas dan standar profesional. Namun, jika Anda memiliki riwayat alergi atau kulit kepala sensitif, mohon informasikan kepada tim kami sebelum treatment dimulai.',
    },
    {
      id: 'faq-salon-9',
      category: 'Layanan Salon',
      question: 'Apakah ada perawatan badan atau lulur body?',
      answer: 'Ya, perawatan badan yang memberikan kerileksan (relaksi) pada tubuh Anda. Disarankan reservasi terlebih dahulu.',
    },
    {
      id: 'faq-salon-10',
      category: 'Layanan Salon',
      question: 'Bisa menanyakan total biaya Salon dulu?',
      answer: 'Bisa. Sebutkan treatment atau kombinasi layanan yang diinginkan supaya tim kami dapat membantu menjelaskan biayanya.',
    },
  ],
  profile: {
    name: 'Desy Salon', tag: 'Beauty for your beautiful beginning', phone: '+62 821-3522-1177',
    address: 'Jl. Desa Pekuncen No.15, RT 02/RW 03, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
    mapsUrl: 'https://maps.app.goo.gl/1mqYn88NWe9zq8AV9',
    openingHours: 'Senin–Minggu, 08.00–17.00 WIB',
    facebook: 'Desyana', facebookUrl: 'https://www.facebook.com/desyana.desyana12',
    instagram: '@desyana_77', instagramUrl: 'https://www.instagram.com/desyana_77/',
    tiktok: '@desyana.s', tiktokUrl: 'https://www.tiktok.com/@desyana.s',
  },
  credentials: { username: 'desy', password: 'adminDESI@2026' },
}
