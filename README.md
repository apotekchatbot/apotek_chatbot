Develop by [auziqni](https://auziqni.com) @ [teknisee](https://teknisee.com)

# Apotek Bot - Automated Patient Follow-Up Chatbot & Dashboard

Apotek Bot adalah sistem terintegrasi yang dirancang untuk membantu apoteker dalam mengelola transaksi obat, melacak kepatuhan konsumsi obat pasien, serta memantau perkembangan terapi pasien secara otomatis menggunakan WhatsApp Chatbot.

Sistem ini menjembatani interaksi antara apoteker (melalui panel internal) dan pasien (melalui WhatsApp) untuk memastikan evaluasi terapi berjalan efektif dan gejala berbahaya dapat dideteksi lebih dini.

---

## Fitur Utama

### 1. Manajemen Transaksi & Data Pasien (Internal Dashboard)

- **Pencatatan Transaksi:** Input data pembelian obat oleh apoteker secara langsung ke dalam sistem.
- **Pelacakan Riwayat Terapi:** Menyimpan data pasien beserta obat-obatan yang dikonsumsi untuk riwayat evaluasi medis.
- **Integrasi Google Sheets:** Menggunakan Google Sheets sebagai _database_ pusat yang fleksibel dan mudah diakses untuk penyimpanan data pasien dan transaksi.

### 2. WhatsApp Automated Follow-Up (Patient Side)

- **Pemicu Kuesioner Otomatis:** Sistem mengirimkan pesan kuesioner evaluasi secara otomatis ke nomor WhatsApp pasien setelah jangka waktu tertentu pasca-pembelian obat.
- **Kuesioner Spesifik Obat:** Pertanyaan yang diajukan oleh chatbot bersifat dinamis dan menyesuaikan dengan jenis obat serta indikasi terapi yang diterima oleh pasien.
- **Logika Alur Terstruktur:** Menggunakan alur percakapan sekuensial (_sequential logic_) untuk memandu pasien menjawab pertanyaan evaluasi satu per satu.

### 3. Sistem Deteksi & Eskalasi Gejala (Escalation System)

- **Skrining Gejala Berbahaya:** Chatbot mampu mengevaluasi jawaban pasien untuk mendeteksi adanya efek samping kritis atau perburukan kondisi kesehatan.
- **Notifikasi Instan untuk Apoteker:** Jika pasien melaporkan gejala yang masuk dalam kategori bahaya (_red flags_), sistem akan langsung memicu eskalasi dan memberikan notifikasi kepada apoteker agar dapat diambil tindakan medis segera.
