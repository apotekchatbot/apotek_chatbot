# apotek-chatbot

tujuan :

- menulis penjualan obat
- melakukan after sales ke pasien yang telah membeli obat
  - salam dari apotek
  - memberikan list obat yang telah dibeli pasien
  - memberikan penjelasan singkat tentang obat yang telah dibeli pasien
  - menanyakan pasien tentang keluhan yang dialami
  - berdasarkan jawaban pasien, chatbot akan meneruskan jawaban ke apoteker

## Arsitektur Utama Sistem

Sistem ini menggunakan model Chatbot Terpusat (Satu Nomor Twilio) dengan Database Terpisah (Banyak Spreadsheet) untuk setiap cabang apotek.

- Front-End & Backend Web (Next.js): Menjadi dashboard internal bagi apoteker untuk input penjualan, mengelola otentikasi, sekaligus bertindak sebagai webhook pintar untuk memproses logika chat dan status dari Twilio.
- Otentikasi & Multi-Tenancy (Clerk): Digunakan untuk manajemen login apoteker. Informasi sensitif seperti spreadsheet_id (ID Google Sheet cabang) dan pharmacist_phone (nomor WA apoteker untuk notifikasi bahaya) disimpan aman di dalam Metadata Clerk (bisa di level User atau Organization).
- Database Finansial & State (Google Sheets API): Berfungsi sebagai database ringan per cabang yang dibuat secara otomatis via Google Drive API di akun utama developer saat apotek baru mendaftar.
- Gerbang Komunikasi (Twilio WhatsApp API): Jembatan komunikasi dua arah ke pasien menggunakan fitur Interactive Messages (tombol klik).

💬 Logika Chatbot & Manajemen Data

1. Metode Rule-Based (Opsi Pilihan Ganda)

Untuk keamanan medis, chatbot tidak menggunakan AI agen, melainkan berbasis pilihan pasti (sudah dibuat di spreed sheet). Ini menghilangkan risiko salah interpretasi teks dari pasien. 2. Konsep Antrean Kuesioner (Queue-Based)

- Satu jenis obat hanya memicu satu pertanyaan.

- Jika pasien membeli lebih dari satu obat, Next.js akan mengantre pertanyaan secara linear (Indeks 0, 1, 2...). Pertanyaan kedua hanya akan dikirim setelah pertanyaan pertama dijawab dengan status Aman.

3. Penanganan Triase (Flagging)

   Jika Jawaban = AMAN: Chatbot lanjut menanyakan obat berikutnya di antrean. Jika habis, chatbot mengirimkan template greeting penutup (Lekas Sembuh).

   Jika Jawaban = BAHAYA (Flag): Antrean chat langsung dihentikan. Chatbot pusat mendeteksi asal cabang pasien, lalu mengirimkan notifikasi WhatsApp otomatis hanya ke nomor apoteker cabang terkait agar apoteker bisa menindaklanjuti pasien secara personal. Chatbot pusat juga mengirimkan template penutup otomatis ke pasien agar pasien tidak menunggu terlalu lama.

4. Fitur Jeda waktu & Pelacakan (Timeout & Tracking)

   Auto-Greeting (Timeout): Jika pasien tidak membalas dalam waktu tertentu, background task (via Upstash QStash/Inngest) akan memicu pengiriman pesan pengingat halus atau penutup otomatis agar serverless Vercel tidak putus.

   Status Ceklis WA: Menggunakan Status Callbacks dari Twilio untuk melacak apakah pesan statusnya delivered (ceklis dua) atau failed (gagal), lalu menuliskan status tersebut ke Google Sheets secara real-time.

🔒 Keamanan & Integritas Google Sheets

Agar data tidak rusak oleh kelalaian manusia (staf apotek), struktur Google Sheets dikunci secara berlapis langsung di Master Template Developer sebelum diduplikasi:

    Sheet 1: Daftar Obat (header dikunci, data dapat diedit)
    sheet 2: Daftar belanja pasien (dikunci total, hanya bisa menulis via api)
    sheet 3: Daftar respon (dikunci total, hanya bisa menulis via api)

## arsitektur spreadsheet

### sheet 1: daftar obat

- obat_id
  dibuat dan diisi manual oleh apoteker cabang, unik untuk setiap obat
- obat_nama
  dibuat dan diisi manual oleh apoteker cabang
- penjelasan
  penjelasan singkat tentang obat, dibuat dan diisi manual oleh apoteker cabang
- pertanyaan
  satu pertanyaan yang akan dikirim ke pasien, dibuat dan diisi manual oleh apoteker cabang
- respon_opsi
  daftar opsi jawaban yang akan dikirim ke pasien, dibuat dan diisi manual oleh apoteker cabang. opsi jawaban dipisahkan dengan tanda (;).setiap jawaban akan dikategorikan menjadi 2 kategori : Aman atau Bahaya.
  bahaya akan diberi flag ditandai dengan tanda bintang (*) di depan jawaban. flag akan memicu notifikasi ke apoteker cabang terkait. jawaban yang tidak ada di daftar opsi akan dianggap "Aman" dan tidak akan diteruskan ke apoteker cabang.
  *Mual lambung ; Pusing ringan ; Tidak ada keluhan

#### sheet 2: daftar belanja pasien

- belanja_id
  dibuat otomatis oleh sistem saat pasien melakukan pembelian obat di apotek cabang
- apotek_petugas
  nama apoteker yang menangani pembelian obat, diinput manual oleh apoteker cabang melalui dashboard internal Next.js
- pasien_nama
  nama pasien yang membeli obat, diinput manual oleh apoteker cabang melalui dashboard internal Next.js
- pasien_umur
  umur pasien yang membeli obat, diinput manual oleh apoteker cabang melalui dashboard internal Next.js
- pasien_gejala
  gejala yang dialami pasien, diinput manual oleh apoteker cabang melalui dashboard internal Next.js
- pasien_durasi
  durasi gejala yang dialami pasien, diinput manual oleh apoteker cabang melalui dashboard internal Next.js
- pasien_wa
  nomor WhatsApp pasien, diinput manual oleh apoteker cabang melalui dashboard internal Next.js
- belanja_list_obat
  daftar obat yang dibeli pasien, diinput manual oleh apoteker cabang melalui dashboard internal Next.js. daftar obat dipisahkan dengan tanda (;) misal : obat_id1 ;obat_id2 ;obat_id3

### sheet 3: daftar respon

- chat_id
  dibuat otomatis oleh sistem saat chatbot mengirimkan pertanyaan ke pasien sambil menunggu jawaban pasien. chat_id akan menjadi acuan untuk menuliskan jawaban pasien ke baris yang sama di sheet 3.
- belanja_id
  dibuat otomatis, menjadi acuan list belanja pasien yang sedang ditanyakan pertanyaan oleh chatbot
- obat_id
  dibuat otomatis, menjadi acuan obat yang sedang ditanyakan pertanyaan oleh chatbot
- pertanyaan
  meulis pertanyaan yang dikirim ke pasien, dibuat otomatis oleh sistem saat chatbot mengirimkan pertanyaan ke pasien
- kirim_status
  menulis status pengiriman pertanyaan ke pasien, dibuat otomatis oleh sistem saat chatbot mengirimkan pertanyaan ke pasien. status pengiriman bisa berupa : sent, delivered, failed
- kirim_waktu
  menulis waktu pengiriman pertanyaan ke pasien, dibuat otomatis oleh sistem saat chatbot mengirimkan pertanyaan ke pasien
- respon
  menulis jawaban pasien terhadap pertanyaan yang dikirimkan oleh chatbot
- respon_waktu
  menulis waktu jawaban pasien terhadap pertanyaan yang dikirimkan oleh chatbot
- respon_flag
  menulis apakah jawaban pasien termasuk kategori flag (bahaya) atau tidak. dibuat otomatis oleh sistem saat pasien menjawab pertanyaan. jika jawaban pasien termasuk kategori flag, maka akan ditulis "Diteruskan ke apoteker" di kolom ini, jika tidak termasuk kategori flag maka akan ditulis "AMAN" di kolom ini.

## Keputusan Scope & Logika (PoC)

    Penanganan Input Teks Manual: Jika pasien mengetik teks dan mengabaikan tombol interaktif, sistem akan menerapkan mekanisme fallback. Chatbot akan membalas dengan pesan error (misal: "Mohon maaf, silakan balas dengan menekan tombol yang telah disediakan") dan tidak memproses input teks mentah untuk menghindari salah interpretasi.

    Logika Triase (Penghentian Antrean): Jika pasien memilih jawaban yang memiliki flag (kategori Bahaya) pada salah satu pertanyaan, antrean broadcast akan langsung dihentikan. Chatbot tidak akan melanjutkan ke pertanyaan obat berikutnya. Sistem akan mengirimkan seluruh belanja_list_obat beserta flag bahaya tersebut ke nomor apoteker cabang agar dapat ditindaklanjuti secara personal.

    Batasan Ruang Lingkup Saat Ini: Untuk mempercepat pengembangan PoC, penyelesaian konflik antrean pasien lintas-cabang (jika nomor yang sama beli di cabang berbeda) dan enkripsi keamanan data dilewati.

⚙️ Aspek Perangkat Lunak: Manajemen Sesi & Limitasi UI

    Manajemen State (Antrean): Karena lingkungan Next.js bersifat stateless, pelacakan sesi percakapan (mengingat pasien sedang di tahap pertanyaan ke berapa) tidak disarankan menggunakan query langsung ke Google Sheets karena akan memakan waktu dan kuota API. Pendekatan yang direkomendasikan adalah menggunakan memori sementara seperti Redis (misal: Upstash).

    Batasan UI WhatsApp (Twilio): Desain opsi jawaban di spreadsheet harus mematuhi limitasi API Meta/Twilio:

        Reply Buttons: Maksimal 3 tombol, dengan batas 20 karakter per tombol.

        List Messages: Maksimal 10 opsi.

    ⚠️ WARNING: Future Considerations (Pasca-PoC)

    Saat proyek ini akan ditingkatkan (scale-up) dari PoC menjadi tahap produksi komersial, hal-hal berikut wajib ditangani:

        Limitasi Rate Google Sheets API: Google membatasi requests hingga 60 per pengguna/menit. Fitur Status Callbacks Twilio (sent/delivered) yang memicu penulisan ke Sheets berkali-kali sangat berisiko gagal saat transaksi sedang ramai. Harus diterapkan sistem batching/queue (misal via Inngest) atau migrasi database transaksional ke SQL.

        Kerentanan Human Error pada Input Delimiter: Mengandalkan apoteker mengetik karakter ; atau * secara manual langsung di Google Sheets sangat rentan typo (misal: spasi ekstra yang merusak logika parsing). Ke depannya, seluruh input master obat harus dilakukan melalui form di dashboard Next.js.

        Kepatuhan Privasi Data (PII): Menyimpan data Personally Identifiable Information (Nama, Umur, Nomor WA, Gejala) secara plain text di Google Sheets memiliki risiko kebocoran tinggi jika tautan tersebar. Enkripsi data sensitif wajib diimplementasikan.

        Konflik Multi-Tenancy (Cross-Branch): Jika satu nomor WA yang sama berbelanja di dua cabang berbeda dalam waktu berdekatan, sistem satu-nomor-pusat Twilio ini akan bingung menentukan webhook dan antrean milik cabang mana yang harus diakses. Perlu dibuat algoritma penentuan prioritas antrean berbasis timestamp.

# google service account credentials

GOOGLE_SERVICE_ACCOUNT_PROJECT_ID= ""
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID= ""
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY= ""
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL= ""
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID= ""
GOOGLE_SERVICE_ACCOUNT_AUTH_URI= ""
GOOGLE_SERVICE_ACCOUNT_TOKEN_URI= ""
GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL= ""
GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL= ""
GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN= ""

"OriginalRepliedMessageSender=whatsapp%3A%2B14155238886
ExternalUserId=whatsapp%3AID.4566546130240823
SmsMessageSid=SM8824d91645395b17594d92659b878468
FrequentlyForwarded=false
NumMedia=0
ProfileName=teknisee
MessageType=interactive
SmsSid=SM8824d91645395b17594d92659b878468
WaId=6285176810035
SmsStatus=received
Body=Konfirmasi
Forwarded=false
ButtonText=Konfirmasi
To=whatsapp%3A%2B14155238886
ButtonPayload=%7BverifyEmail%3Aasd%40asd.com%7D
NumSegments=1
ReferralNumMedia=0
MessageSid=SM8824d91645395b17594d92659b878468
AccountSid=ACefb707f7c4ce4d15bc4261fd1d5ed615
OriginalRepliedMessageSid=MM5cc44eecf7dab0d48d4529d0fa4af44d
ChannelMetadata=%7B%22type%22%3A%22whatsapp%22%2C%22data%22%3A%7B%22context%22%3A%7B%22ButtonText%22%3A%22Konfirmasi%22%2C%22Forwarded%22%3A%22false%22%2C%22FrequentlyForwarded%22%3A%22false%22%2C%22ProfileName%22%3A%22teknisee%22%2C%22WaId%22%3A%226285176810035%22%7D%7D%7D
From=whatsapp%3A%2B6285176810035&ApiVersion=2010-04-01"

mari berdiskusi, jangan berikan kode sebelum saya minta.

secara garis besar project ini sudah mendekati final.

dari apoteker yang input belanjaan, sistem akan menulis belanjaan ke ss di api/belanja. di api/belanja juga sistem akan melihat obat pertama, cek pertanyaan dan respon opsi
