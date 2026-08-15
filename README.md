# ⚡ CryptoPredict Pulse (5m & 20m Live Tracker)

> **Ultra-Fast Real-Time Price & Countdown Monitor for Prediction Market Traders (Polymarket & Crypto.com Predict)**

[![Live Demo](https://img.shields.io/badge/Live-Demo%20Online-00f090?style=for-the-badge&logo=google-chrome&logoColor=white)](https://rabapuba.github.io/crypto-predict-live/)
[![WebSocket](https://img.shields.io/badge/Feed-Binance%20Direct%20WS-00d2ff?style=for-the-badge&logo=binance&logoColor=black)](https://rabapuba.github.io/crypto-predict-live/)
[![Auto Rollover](https://img.shields.io/badge/Rollover-Zero%20Lag%20Automated-9d4edd?style=for-the-badge)](https://rabapuba.github.io/crypto-predict-live/)

🔗 **Live Web App URL**: [https://rabapuba.github.io/crypto-predict-live/](https://rabapuba.github.io/crypto-predict-live/)

---

## 🎯 Tujuan & Fitur Utama

Aplikasi web ini dirancang khusus untuk memantau perubahan harga kilat secara real-time pada pasar prediksi kripto (*prediction markets*) seperti di **Polymarket** dan **Crypto.com Predict** tanpa perlu refresh browser secara manual.

### 🌟 Fitur Unggulan:
1. **Live Sub-Second WebSocket Feed**: Terhubung langsung ke tick stream Binance dengan latensi milidetik dan visual flash indikator naik/turun.
2. **Preset Interval 5 Menit & 20 Menit**: Sinkronisasi waktu presisi sesuai putaran pasar prediksi (*5m, 15m, 20m, 1h, 2h*).
3. **Auto Strike Price & Rollover**: 
   - Otomatis mencatat harga awal (*Strike Price*) saat putaran dimulai.
   - Menghitung $\Delta$ perubahan harga secara instan terhadap Strike Price.
   - **Otomatis rollover** ke periode berikutnya saat timer mencapai `00:00` tanpa reload halaman.
4. **Grafik Mikro Real-Time (60FPS Canvas)**: Menampilkan jalur pergerakan harga real-time dan garis batas *Strike Baseline* (Amber) untuk melihat apakah posisi saat ini sedang berada di zona **UP** (Hijau) atau **DOWN** (Merah).
5. **Indikator Momentum & Tekanan Bull/Bear**: Mengukur rasio kecepatan tick beli vs jual secara dinamis.
6. **Riwayat Putaran (Round History Ledger)**: Merekap hasil putaran yang telah selesai beserta selisih harga dan persentase hasil.
7. **Audio Alerts (Web Audio API)**: Suara notifikasi sintetis saat waktu tersisa 30 detik, hitung mundur 10 detik, dan saat periode berganti (resolusi).
8. **Kalkulator Trading Polymarket**: Menghitung jumlah lembar saham (*shares*), potensi payout, dan ROI profit bersih secara instan.

---

## 🚀 Asset Kripto yang Didukung
- **BTC/USDT** (Bitcoin)
- **ETH/USDT** (Ethereum)
- **SOL/USDT** (Solana)
- **XRP/USDT** (Ripple)
- **DOGE/USDT** (Dogecoin)

---

## 💻 Cara Menjalankan Secara Lokal
Cukup buka file `index.html` di browser modern apa saja, atau jalankan server lokal:

```bash
# Menggunakan python http server
python3 -m http.server 8000

# Atau menggunakan npx serve
npx serve .
```

Buka `http://localhost:8000` pada browser Anda.

---

## 📱 Progressive Web App (PWA)
Aplikasi ini sudah dilengkapi `manifest.json` sehingga dapat ditambahkan ke Layar Utama (*Add to Home Screen*) di smartphone Android/iOS maupun diinstal di Chrome Desktop layaknya aplikasi native.

---

## 📄 Lisensi
MIT License &copy; 2026.
