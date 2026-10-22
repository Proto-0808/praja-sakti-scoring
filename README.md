# Praja Sakti Group — Sistem Penilaian Konsultan Arsitek

Aplikasi web untuk menilai dan memeringkat 3 studio arsitek untuk proyek
**Compound Kemanggisan Pulo, Jakarta** — Compound 3.000 m², unit rumah 35–45 m².

Static SPA (Tailwind CDN + Vanilla JS + Supabase JS v2 UMD). Tanpa proses build.

- **6 parameter utama / 29 sub-parameter** (bobot total = 100%).
- **Ranking langsung 1–3** per sub-parameter (#1 = 3 poin, #2 = 2 poin, #3 = 1 poin). Skor tertimbang maksimum **3,0000**.
- Mode cloud **berbagi ruang tanpa login** (Plan A2) atau mode lokal murni.

---

## 1. Cara pakai cepat (mode lokal)

Buka `index.html` di browser (tanpa server). Data disimpan di `localStorage`.
Aplikasi memulai dengan satu penilai placeholder bernama **Guest** — ganti
namanya lewat kolom **Penilai aktif** atau tambah penilai baru.

> Beberapa browser membatasi `localStorage`/CDN saat dibuka via `file://`.
> Jika bermasalah, sajikan lewat server statis: `python -m http.server` atau `npx serve`.

---

## 2. Setup cloud (Plan A2 — tanpa login)

1. Buat proyek di https://supabase.com
2. Buka **SQL Editor** → tempel & jalankan `supabase/schema.sql`.
   (Skrip membuat tabel baru; skema lama akan di-`drop` — data lama kosong, aman.)
3. **Tidak perlu mengaktifkan Anonymous sign-ins.** Cukup salin:
   - **Project URL**
   - **anon public key**
4. Tempel di `assets/config.js` (opsional: isi `resetPassphrase` untuk mengunci
   tombol reset cloud).
5. Deploy folder ini ke hosting statis dan bagikan URL-nya.

> **Peringatan keamanan (A2).** RLS dibuka untuk role `anon`/`authenticated`
> (`using (true)`). Siapa pun yang memiliki URL + anon key dapat membaca,
> mengubah, atau menghapus data ruang ini lewat API. Ini kompromi yang dipilih
> agar dedup nama global dan reset cloud berfungsi tanpa login. Jaga URL tetap
> privat. `resetPassphrase` di `config.js` hanya penghalang UI, bukan keamanan
> sebenarnya (file ini publik).

---

## 3. Model data & penilaian

- 6 parameter utama, 29 sub-parameter. Bobot sub dalam satu parameter menjumlah
  ke bobot parameter tersebut; total sub = 100%.
- Setiap sub-parameter diberi ranking langsung: **#1 = 3 poin, #2 = 2 poin, #3 = 1 poin**.
  Dalam satu sub-parameter, satu peringkat hanya untuk satu kandidat; klik ulang
  untuk membatalkan.
- Skor tertimbang = `poin × bobot sub`; total kandidat maksimum **3,0000**.
- Dedup nama **case-insensitive** (`lower(trim(name))`); satu nama hanya satu profil.
- **Guest** hanya placeholder lokal dan **tidak pernah** disimpan ke cloud.

| # | Parameter | Bobot |
|---|---|---|
| 1 | Relevant Experience | 20% |
| 2 | Sense Bisnis / Segmen Apatite | 20% |
| 3 | Reputasi | 15% |
| 4 | Design Vision and Style (Aesthetic) | 20% |
| 5 | Chemistry / Cara Kerja | 15% |
| 6 | Budget | 10% |

> Catatan: teks sub-parameter **Budget** di `assets/data.js` perlu Anda
> verifikasi (lihat komentar di file bila ada ketidaksesuaian dengan dokumen
> sumber).

---

## 4. Struktur berkas

```
index.html            Shell + CDN (Tailwind, Supabase, Inter)
assets/config.js      konfigurasi Supabase (URL, anon key, roomId, resetPassphrase)
assets/data.js        6 parameter / 29 sub-parameter, 3 kandidat, Guest default
assets/scoring.js     mesin hitung rank-only, konsensus, rata-rata param/sub
assets/state.js       state, localStorage, dedup, lifecycle penilai, sinkronisasi cloud
assets/views.js       render header, tab, matriks hierarkis, rekapitulasi
assets/exports.js     ekspor CSV / Markdown / JSON + impor JSON
assets/main.js        bootstrap, event, modal (termasuk reset terkonfirmasi), toast
supabase/schema.sql   tabel + RLS terbuka + unique index nama + realtime
```

Kunci `localStorage`: `praja_sakti_architect_scoring_v6_final`,
`praja_active_eval_id`.

---

## 4b. Alur penilai

1. **Tambah / pilih penilai.** Ketik nama lalu submit:
   - nama sudah ada → beralih ke profil tersebut;
   - Guest masih kosong → Guest diganti nama;
   - selain itu → profil baru dibuat.
2. **Penilai aktif** bisa diganti namanya langsung di kolomnya (Enter / klik luar).
   Nama yang bentrok dengan penilai lain akan ditolak.
3. Tab **Penilaian Per-Penilai**: 6 grup parameter; tiap sub-parameter punya
   tombol #1/#2/#3. Subtotal per parameter, total (maks 3,00), dan peringkat
   otomatis ditampilkan.
4. Tab **Rekapitulasi Tim**: podium konsensus, tabel perbandingan multi-penilai,
   rincian rata-rata per parameter dan per sub-parameter (★ = tertinggi).

---

## 5. Ekspor / Impor / Reset

- **CSV** — format panjang 29 sub-parameter (untuk Excel).
- **Laporan (.md)** — laporan eksekutif Markdown.
- **JSON** — backup penuh state; dapat diimpor kembali.
- **Reset** — menghapus data lokal (dan opsional data cloud ruang ini), lalu
  memulai ulang dengan satu Guest. Wajib mengetik `HAPUS`; bila `resetPassphrase`
  diisi, passphrase juga diminta.

---

## 6. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| Banner "Mode lokal (tanpa sinkronisasi cloud)" | `assets/config.js` belum diisi / belum dihosting. |
| "Cloud tidak tersedia" | Cek URL & anon key, jalankan ulang `schema.sql`, cek Console. |
| Perubahan tidak tampil di perangkat lain | Pastikan realtime aktif (`alter publication` di schema.sql); muat ulang. |
| Nama penilai ditolak | Nama (tanpa peduli huruf besar/kecil) sudah dipakai penilai lain. |
| Reset cloud gagal | Isi `resetPassphrase` dengan benar, atau cek koneksi. |

---

_Dokumen & aplikasi internal Praja Sakti Group — tidak untuk disebarluaskan._
