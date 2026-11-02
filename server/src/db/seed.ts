import { supabase } from '../config/supabase.js'

async function seed() {
  console.log('🌱 Memulai proses seeding data awal ke Supabase...')

  // 1. Categories
  const categories = [
    { id: 'akad', name: 'Akad', slug: 'akad' },
    { id: 'resepsi', name: 'Resepsi', slug: 'resepsi' },
    { id: 'wisuda', name: 'Wisuda', slug: 'wisuda' },
    { id: 'perawatan', name: 'Perawatan', slug: 'perawatan' },
  ]
  const { error: catErr } = await supabase.from('categories').upsert(categories)
  if (catErr) console.warn('Gagal seed categories:', catErr.message)
  else console.log('✅ Categories berhasil di-seed.')

  // 2. Packages
  const packages = [
    {
      id: 'paket-akad',
      name: 'Akad Istimewa',
      category: 'Akad',
      price: 1850000,
      original_price: 2200000,
      badge: 'Favorit',
      image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85',
      description: 'Riasan anggun dan personal untuk momen sakral yang tak terlupakan.',
      features: ['Makeup akad premium', 'Hijab do & aksesori', 'Hairdo keluarga 1 orang', 'Touch-up sebelum acara'],
    },
    {
      id: 'paket-jawa',
      name: 'Paes Ageng Jawa',
      category: 'Resepsi',
      price: 4250000,
      original_price: 4800000,
      badge: 'Best seller',
      image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85',
      description: 'Tata rias tradisional dengan detail paes yang dibuat sepenuh hati.',
      features: ['Rias pengantin & paes', 'Busana adat lengkap', 'Melati & aksesori', 'Rias orang tua 2 orang'],
    },
    {
      id: 'paket-modern',
      name: 'Modern Grace',
      category: 'Resepsi',
      price: 3250000,
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
      description: 'Look modern yang ringan, tahan lama, dan tetap terasa seperti dirimu.',
      features: ['Makeup flawless premium', 'Hairdo atau hijab styling', 'Pilihan gaun resepsi', 'Touch-up selama acara'],
    },
    {
      id: 'paket-wisuda',
      name: 'Wisuda Cantik',
      category: 'Wisuda',
      price: 350000,
      image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85',
      description: 'Riasan segar yang cantik di foto dari prosesi sampai perayaan.',
      features: ['Makeup natural glam', 'Hairdo simpel', 'Bulu mata premium', 'Konsultasi look'],
    },
    {
      id: 'paket-pra',
      name: 'Ritual Pra-Nikah',
      category: 'Perawatan',
      price: 650000,
      image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1000&q=85',
      description: 'Waktu istimewa untuk merawat diri menjelang hari bahagiamu.',
      features: ['Facial calming', 'Lulur & body mask', 'Hair spa', 'Teh herbal hangat'],
    },
    {
      id: 'paket-akad-resepsi',
      name: 'Akad & Resepsi Lengkap',
      category: 'Akad',
      price: 5950000,
      original_price: 6800000,
      badge: 'Hemat 12%',
      image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85',
      description: 'Satu tim andal untuk menemani setiap babak hari pernikahanmu.',
      features: ['Rias akad & resepsi', '2 set busana pengantin', 'Rias keluarga 4 orang', 'Tim standby seharian'],
    },
  ]
  const { error: pkgErr } = await supabase.from('packages').upsert(packages)
  if (pkgErr) console.warn('Gagal seed packages:', pkgErr.message)
  else console.log('✅ Packages berhasil di-seed.')

  // 3. Schedules
  const schedules = [
    { id: 'jadwal-1', client_name: 'Nadia Putri', package_name: 'Akad Istimewa', event_date: '2026-11-14', event_time: '08:00', session: 'Pagi', location: 'Gedung Serbaguna Melati', notes: 'Makeup soft glam, kulit sensitif.', status: 'Terkonfirmasi' },
    { id: 'jadwal-2', client_name: 'Aulia Rahma', package_name: 'Paes Ageng Jawa', event_date: '2026-11-14', event_time: '10:00', session: 'Pagi', location: 'Pendopo Taman Sari', notes: 'Konsultasi busana hari Jumat.', status: 'Menunggu DP' },
    { id: 'jadwal-3', client_name: 'Sinta Maharani', package_name: 'Modern Grace', event_date: '2026-11-21', event_time: '13:00', session: 'Siang', location: 'Hotel Aruna', notes: '', status: 'Terkonfirmasi' },
  ]
  const { error: schErr } = await supabase.from('schedules').upsert(schedules)
  if (schErr) console.warn('Gagal seed schedules:', schErr.message)
  else console.log('✅ Schedules berhasil di-seed.')

  // 4. Gallery
  const gallery = [
    { id: 'foto-1', title: 'Seruni di Pagi Akad', event_type: 'Akad Nikah', tag: 'Soft glam', image_url: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1000&q=85', description: 'Riasan lembut dengan sentuhan rose untuk akad yang intim.' },
    { id: 'foto-2', title: 'Paes Ageng Ningrat', event_type: 'Resepsi Adat', tag: 'Adat Jawa', image_url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1000&q=85', description: 'Detail tradisi Jawa yang dirangkai dengan penuh ketelitian.' },
    { id: 'foto-3', title: 'A Day to Remember', event_type: 'Resepsi Adat', tag: 'Modern', image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85', description: 'Tampilan modern dan romantis untuk perayaan bersama keluarga.' },
    { id: 'foto-4', title: 'Wisuda Penuh Cerita', event_type: 'Wisuda & Pesta', tag: 'Natural', image_url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=85', description: 'Natural glam yang terasa ringan untuk hari kelulusan.' },
    { id: 'foto-5', title: 'Janji di Taman', event_type: 'Akad Nikah', tag: 'Garden', image_url: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1000&q=85', description: 'Nuansa segar untuk pernikahan dengan suasana taman.' },
    { id: 'foto-6', title: 'Malam yang Anggun', event_type: 'Resepsi Adat', tag: 'Glam', image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85', description: 'Riasan berkarakter untuk malam perayaan yang istimewa.' },
  ]
  const { error: galErr } = await supabase.from('gallery').upsert(gallery)
  if (galErr) console.warn('Gagal seed gallery:', galErr.message)
  else console.log('✅ Gallery berhasil di-seed.')

  // 5. Salon Profile
  const profile = {
    id: 'default',
    name: 'Desy Salon',
    tag: 'Beauty for your beautiful beginning',
    phone: '+62 821-3522-1177',
    address: 'Jl. Desa Pekuncen No.15, RT 02/RW 03, Pekuncen, Kec. Jatilawang, Kabupaten Banyumas, Jawa Tengah 53174',
    opening_hours: 'Senin–Minggu, 08.00–17.00 WIB',
    facebook: 'Desyana',
    facebook_url: 'https://www.facebook.com/desyana',
    instagram: '@desyana_77',
    instagram_url: 'https://www.instagram.com/desyana_77/',
    tiktok: '@desyana.s',
    tiktok_url: 'https://www.tiktok.com/@desyana.s',
  }
  const { error: profErr } = await supabase.from('salon_profile').upsert(profile)
  if (profErr) console.warn('Gagal seed profile:', profErr.message)
  else console.log('✅ Profile berhasil di-seed.')

  console.log('🎉 Seeding selesai!')
}

seed().catch(console.error)

