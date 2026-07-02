# Pimora

Panduan untuk menjalankan aplikasi ini:

## 1. Instalasi Dependency

Jalankan perintah berikut di terminal untuk menginstal dependency:

```bash
npm install
```

## 2. Setup Database

1. **Buat database baru** dengan nama `db_pimora` melalui phpMyAdmin.
2. **Import file** `db_pimora.sql` ke dalam database tersebut menggunakan fitur import di phpMyAdmin.

## 3. Jalankan Aplikasi

Setelah semua langkah di atas selesai, jalankan aplikasi dengan perintah berikut di terminal:

```bash
npm run start
```

Ikuti instruksi lebih lanjut pada dokumentasi atau file konfigurasi yang tersedia.
==============================================
==============================================
==============================================
# Pimora

Sistem Automation Streaming Node.js, Express, MySQL, dan Nginx.

---

# Persyaratan

- Ubuntu 22.04 / 24.04
- Git
- Node.js 22 LTS
- Nginx
- MySQL Server
- PM2
- FFmpeg

---

# 1. Clone Repository

```bash
cd /var/www

git clone https://github.com/USERNAME/pimora.git

cd pimora
```

> Ganti URL repository dengan repository Anda.

---

# 2. Update Server

```bash
sudo apt update && sudo apt upgrade -y
```

---

# 3. Install Paket Pendukung

```bash
sudo apt install -y \
curl \
git \
unzip \
build-essential \
software-properties-common
```

---

# 4. Install Node.js

Install Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

sudo apt install -y nodejs
```

Cek versi

```bash
node -v
npm -v
```

---

# 5. Install Nginx

```bash
sudo apt install nginx -y
```

Aktifkan service

```bash
sudo systemctl enable nginx

sudo systemctl start nginx
```

Cek status

```bash
sudo systemctl status nginx
```

---

# 6. Install MySQL

```bash
sudo apt install mysql-server -y
```

Aktifkan service

```bash
sudo systemctl enable mysql

sudo systemctl start mysql
```

Cek status

```bash
sudo systemctl status mysql
```

---

# 7. Install FFmpeg

Project ini membutuhkan FFmpeg.

```bash
sudo apt install ffmpeg -y
```

Cek instalasi

```bash
ffmpeg -version
```

---

# 8. Install Dependency Project

Masuk ke folder project

```bash
cd /var/www/pimora
```

Install dependency

```bash
npm install
```

---

# 9. Konfigurasi Environment

Copy file environment

```bash
cp .env.example .env
```
// === MySQL & Email Transport (Auth) ===
ubah URL di app.js supaya sesuai dengan URL/IPServer
```bash 
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:8000";
```

> Jika project sudah menyediakan file `.env`, langkah ini dapat dilewati.

Edit file

```bash
nano .env
```

Contoh konfigurasi

```env
PORT=8000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=pimora

JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

Simpan perubahan.

---

# 10. Import Database

Masuk ke MySQL

```bash
mysql -u root -p
```

Buat database

```sql
CREATE DATABASE db_pimora;
```

Import file SQL

```bash
mysql -u root -p db_pimora < db_pimora.sql
```

---

# 11. Jalankan Project

```bash
npm start
```

atau

```bash
node app.js
```

Aplikasi akan berjalan pada

```
http://localhost:8000
```

---

# 12. Install PM2

```bash
sudo npm install -g pm2
```

Jalankan aplikasi

```bash
pm2 start app.js --name pimora
```

Simpan konfigurasi PM2

```bash
pm2 save
```

Agar otomatis berjalan saat VPS reboot

```bash
pm2 startup
```

Ikuti perintah yang ditampilkan PM2, kemudian jalankan kembali

```bash
pm2 save
```

---

# 13. Cek Status PM2

```bash
pm2 list
```

Melihat log

```bash
pm2 logs pimora
```

Restart aplikasi

```bash
pm2 restart pimora
```

Stop aplikasi

```bash
pm2 stop pimora
```

---

# 14. Konfigurasi Nginx

Edit konfigurasi

```bash
sudo nano /etc/nginx/sites-available/default
```

Isi konfigurasi

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name _;

    location / {
        proxy_pass http://localhost:8000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Simpan kemudian cek konfigurasi

```bash
sudo nginx -t
```

Restart Nginx

```bash
sudo systemctl restart nginx
```

---

# 15. Membuka Firewall

Jika menggunakan UFW

```bash
sudo ufw allow 80/tcp

sudo ufw allow 6278/tcp

sudo ufw reload
```

Cek status

```bash
sudo ufw status
```

---

# 16. Verifikasi

Cek aplikasi

```bash
pm2 list
```

Cek port

```bash
ss -tulpn
```

Buka browser

```
http://IP-VPS
```

atau

```
http://DOMAIN
```

---

# Struktur Project

```
pimora/
│
├── app.js
├── package.json
├── package-lock.json
├── .env
├── public/
├── uploads/
├── routes/
├── views/
└── node_modules/
```

---

# Perintah PM2

Menjalankan aplikasi

```bash
pm2 start app.js --name pimora
```

Restart

```bash
pm2 restart pimora
```

Stop

```bash
pm2 stop pimora
```

Hapus

```bash
pm2 delete pimora
```

Log

```bash
pm2 logs pimora
```

Status

```bash
pm2 list
```
---
#Auth
user: hanissiddiq10@gmail.com
pass: 12345
---
==================================
<img width="1592" height="815" alt="Image" src="https://github.com/user-attachments/assets/e537c130-ae46-4535-8f8b-d4ac62b2b6fc" />

<img width="1587" height="824" alt="Image" src="https://github.com/user-attachments/assets/f2a4a973-e18a-49c5-973c-3fa02c9d38ef" />

<img width="1588" height="816" alt="Image" src="https://github.com/user-attachments/assets/fce2d1dc-7675-4b51-9840-367d3b5fc2ff" />

<img width="1597" height="812" alt="Image" src="https://github.com/user-attachments/assets/082fbe40-8df4-491a-b7ac-8917fe77915d" />

<img width="1587" height="821" alt="Image" src="https://github.com/user-attachments/assets/19f34cf7-82f7-442c-8f83-ff0ed6d2513e" />

<img width="1599" height="818" alt="Image" src="https://github.com/user-attachments/assets/7219a6d4-4f4d-4d09-8a93-a20b9fb7d69e" />

<img width="1582" height="806" alt="Image" src="https://github.com/user-attachments/assets/76f03f88-0e55-4136-9928-1b7b35ea8d40" />

<img width="1583" height="808" alt="Image" src="https://github.com/user-attachments/assets/1d2e1df1-d948-4329-b9ca-b3785cf724d4" />

<img width="1590" height="752" alt="Image" src="https://github.com/user-attachments/assets/3784cd67-babd-45cd-a7cb-37d0006287ac" />
==================================
# Lisensi

Project ini digunakan untuk kebutuhan pengembangan Sistem Automation Streaming (PIMORA).
