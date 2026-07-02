# Troubleshooting Upload File di VPS (Nginx + Node.js + PM2)

## Permasalahan

Saat melakukan upload file melalui aplikasi menggunakan endpoint:

```http
POST /upload/folder
```

browser menampilkan error:

```text
413 Request Entity Too Large
```

dan pada Developer Tools muncul:

```text
POST /upload/folder 413 (Request Entity Too Large)
```

Response dari server:

```html
413 Request Entity Too Large
nginx/1.18.0 (Ubuntu)
```

Sedangkan upload file kecil (±100 KB) berhasil, namun upload file berukuran 2 MB hingga 15 MB selalu gagal.

---

# Proses Analisis

Beberapa pengecekan yang dilakukan:

* Memastikan Express berjalan normal melalui PM2.
* Memastikan route `/upload/folder` tidak mengalami error.
* Memastikan konfigurasi Multer sudah mengizinkan upload hingga 200 MB.
* Memastikan Node.js berjalan pada port **8000**.
* Memastikan Nginx melakukan reverse proxy ke aplikasi Node.js.
* Menambahkan konfigurasi:

```nginx
client_max_body_size 500M;
proxy_request_buffering off;
```

Namun error **413** masih tetap muncul.

---

# Penyebab

Setelah dilakukan pengecekan lebih lanjut menggunakan:

```bash
nginx -T
```

ternyata terdapat **dua Virtual Host** yang aktif:

* `default`
* `pimora`

Konfigurasi `default` masih ikut diproses oleh Nginx sehingga request upload tidak menggunakan konfigurasi Virtual Host `pimora` yang telah diberi:

```nginx
client_max_body_size 500M;
```

Akibatnya Nginx tetap menggunakan konfigurasi lama dan mengembalikan:

```text
413 Request Entity Too Large
```

---

# Solusi

## 1. Nonaktifkan Virtual Host Default

Hapus symbolic link:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

atau nonaktifkan sesuai kebutuhan.

Pastikan hanya Virtual Host aplikasi yang aktif:

```bash
ls -l /etc/nginx/sites-enabled
```

Output yang diharapkan:

```text
pimora -> /etc/nginx/sites-available/pimora
```

---

## 2. Konfigurasi Virtual Host

Gunakan konfigurasi seperti berikut:

```nginx
server {

    server_name ip.atlantic-server.com;

    client_max_body_size 500M;

    proxy_request_buffering off;

    proxy_connect_timeout 1200;
    proxy_send_timeout 1200;
    proxy_read_timeout 1200;

    location / {

        proxy_pass http://localhost:8000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
    }
}
```

> **Catatan:** Sesuaikan directive `listen` dengan konfigurasi port yang digunakan pada server. Pada kasus ini, setelah Virtual Host `default` dinonaktifkan, konfigurasi berjalan dengan baik.

---

## 3. Reload Nginx

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

# Hasil

Setelah Virtual Host `default` dinonaktifkan dan hanya menggunakan konfigurasi `pimora`, upload file besar berhasil dilakukan tanpa muncul lagi error:

```text
413 Request Entity Too Large
```

Aplikasi kini dapat mengunggah file video maupun audio sesuai batas yang telah ditentukan.

---

# Kesimpulan

Permasalahan bukan berasal dari:

* Express.js
* Multer
* PM2
* Kode JavaScript (`fetch`)
* Route upload

Melainkan disebabkan oleh **konfigurasi Nginx**, yaitu adanya **Virtual Host `default` yang masih aktif** sehingga request upload tidak menggunakan konfigurasi Virtual Host aplikasi (`pimora`) yang telah mengatur `client_max_body_size`.

Setelah Virtual Host `default` dinonaktifkan dan konfigurasi `pimora` dijadikan satu-satunya Virtual Host aktif, proses upload file berjalan normal tanpa error.

