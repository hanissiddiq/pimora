const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { spawn, exec, execSync } = require("child_process");
const session = require("express-session");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const os = require("os");

// Pastikan Anda mengubah kunci rahasia ini
const SECRET_KEY = process.env.SECRET_KEY || "your-strong-secret-key-12345";
const SESSION_SECRET = process.env.SESSION_SECRET || "your-other-strong-secret";

const app = express();
const PORT = 8000;

const cors = require("cors");

app.use(cors({
  origin: 'http://localhost:8000',  // Ganti dengan URL frontend Anda
  credentials: true,  // Mengizinkan pengiriman cookies
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
       maxAge: 60 * 60 * 1000,  // 1 jam
      httpOnly: true,  // Untuk mencegah akses dari JavaScript di frontend
      secure: process.env.NODE_ENV === 'production',  // Hanya aktif jika menggunakan HTTPS
    },
  })
);

// ===== AUTH =====
const userFile = path.join(__dirname, "user.json");
const defaultUser = { username: "admin", password: "12345" };

async function setupUserFile() {
  if (!fs.existsSync(userFile)) {
    console.log("Membuat file user.json dengan user default...");
    const hashedPassword = await bcrypt.hash(defaultUser.password, 10);
    fs.writeFileSync(
      userFile,
      JSON.stringify({ username: defaultUser.username, password: hashedPassword }, null, 2)
    );
  } else {
    const user = JSON.parse(fs.readFileSync(userFile, "utf-8"));
    // Pastikan hash bcrypt dimulai dengan $2a$, $2b$, atau $2y$
    if (!/^\$2[aby]\$/.test(user.password)) {
      console.log("Mendeteksi password plaintext, menghashing ulang...");
      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;
      fs.writeFileSync(userFile, JSON.stringify(user, null, 2));
    }}}

function authJWT(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized, token kosong" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token invalid/expired" });
    }
    req.user = user;
    next();
  });
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return authJWT(req, res, next);
}

// ===== Routes Login/Logout =====
// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const user = JSON.parse(fs.readFileSync(userFile, "utf-8"));
//      console.log("User from file:", user); // Tambahkan log untuk mengecek apakah data benar
//     if (username === user.username && (await bcrypt.compare(password, user.password))) {
//       console.log("Login sukses, sesi diset:", req.session.user); // Log sesi
//       req.session.user = { username };
//       return res.json({ message: "Login sukses", user: username });
//     }
//     return res.status(401).json({ message: "Username/password salah" });
//   } catch (err) {
//     console.error(err);  // Log error jika terjadi masalah
//     return res.status(500).json({ message: "Terjadi kesalahan server saat login" });
//   }
// });
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = JSON.parse(fs.readFileSync(userFile, "utf-8"));
    console.log("Password yang dimasukkan:", password);  // Log password yang diterima
    console.log("Password dari file:", user.password);  // Log password yang disimpan

    // Periksa apakah password yang dimasukkan cocok dengan hash yang ada di file
    const match = await bcrypt.compare(password, user.password);
    console.log("Password cocok:", match);  // Log hasil perbandingan

    if (username === user.username && match) {
      req.session.user = { username };
      return res.json({ message: "Login sukses", user: username });
    }
    return res.status(401).json({ message: "Username/password salah" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Terjadi kesalahan server saat login" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logout berhasil" }));
});

app.get("/me", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  res.status(401).json({ loggedIn: false });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Lengkapi username & password" });
  }
  try {
    const user = JSON.parse(fs.readFileSync(userFile, "utf-8"));
    if (username !== user.username) {
      return res.status(401).json({ message: "Username salah" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Password salah" });
    }
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    return res.json({ message: "Login sukses", token });
  } catch (err) {
    return res.status(500).json({ message: "Server error saat login" });
  }
});

app.post("/change-credentials", requireAuth, async (req, res) => {
  const { newUsername, oldPass, newPass } = req.body;
  try {
    const user = JSON.parse(fs.readFileSync(userFile, "utf-8"));
    if (!(await bcrypt.compare(oldPass, user.password))) {
      return res.status(400).json({ message: "Password lama salah" });
    }
    if (newUsername && newUsername.trim() !== "") {
      user.username = newUsername.trim();
    }
    if (newPass && newPass.trim() !== "") {
      const newHashedPassword = await bcrypt.hash(newPass, 10);
      user.password = newHashedPassword;
    }
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));
    res.json({ message: "✅ Username/Password berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ message: "❌ Terjadi kesalahan server" });
  }
});

// ===== Upload Root =====
const uploadRoot = path.join(__dirname, "uploads");
const videoRoot = path.join(uploadRoot, "videos");
const audioRoot = path.join(uploadRoot, "audios");
const logDir = path.join(__dirname, "logs");
const tempDir = path.join(__dirname, "temp");

fs.mkdirSync(videoRoot, { recursive: true });
fs.mkdirSync(audioRoot, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

// Utility//
function sanitizeName(name) {
  if (!name || typeof name !== "string") {
    return "default";
  }
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").trim().replace(/_{2,}/g, "_");
}

function escapeShellArg(arg) {
  // Melindungi argumen dari injeksi perintah shell
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

// ===== Multer Storage + Validasi =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = sanitizeName(req.body.folder || req.params.name || "default");
    const target = file.mimetype.startsWith("video/")
      ? path.join(videoRoot, folder)
      : path.join(audioRoot, folder);
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = sanitizeName(path.basename(file.originalname, ext));
    cb(null, base + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "audio/mpeg", "audio/mp4", "audio/x-m4a"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipe file tidak diizinkan"));
    }
    cb(null, true);
  },
});

// ===== Streams Persistence =====
const streamFile = path.join(__dirname, "streams.json");
let streams = [];
let processes = {};
let manualStop = {};
let timeouts = {}; // Objek untuk menyimpan referensi timeout

function loadStreams() {
  if (fs.existsSync(streamFile)) {
    try {
      streams = JSON.parse(fs.readFileSync(streamFile, "utf-8"));
    } catch (err) {
      console.error("Gagal baca streams.json:", err);
      streams = [];
    }
  }
}

function saveStreams() {
  try {
    fs.writeFileSync(streamFile, JSON.stringify(streams, null, 2));
  } catch (err) {
    console.error("Gagal simpan streams.json:", err);
  }
}
loadStreams();
streams.forEach((s) => {
  if (s.status === "Running") s.status = "Stopped";
});
saveStreams();

// ===== Fungsi Stop Stream =====
function stopStream(id) {
  // Hapus timeout yang sudah ada
  if (timeouts[id]) {
    clearTimeout(timeouts[id]);
    delete timeouts[id];
  }

  // Kill proses ffmpeg yang sedang terdaftar
  if (processes[id]) {
    manualStop[id] = true;
    try {
      processes[id].kill("SIGKILL");
    } catch (e) {
      console.error(`❌ Gagal kill process untuk stream ${id}:`, e.message);
    }
    delete processes[id];
  }

  // 🔥 Kill semua ffmpeg yang mungkin nyangkut (berdasarkan ID & file temp)
  try {
    execSync(`pkill -f video_list_${id}.txt || true`);
    execSync(`pkill -f merged_audio_${id}.aac || true`);
    execSync(`pkill -f ${id} || true`);
  } catch (e) {
    console.error(`❌ Gagal pkill ffmpeg untuk stream ${id}:`, e.message);
  }

  // Update status stream di memory & simpan ke file
  const stream = streams.find((s) => s.id === id);
  if (stream) {
    stream.status = "Stopped";
    stream.stopType = "manual";
    stream.stopDuration = Math.floor(
      (Date.now() - new Date(stream.startTime).getTime()) / 1000
    );
    stream.message = "Stream dihentikan manual";
    saveStreams();
  }

  console.log(`⏹ Stream ${id} dihentikan manual`);
}

// ===== FFprobe (Async) =====
function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 ${escapeShellArg(filePath)}`,
      (error, stdout, stderr) => {
        if (error) return resolve(0);
        resolve(parseFloat(stdout) || 0);
      }
    );
  });
}

// ===== Folder API =====
app.post("/upload/folder", requireAuth, upload.any(), (req, res) => {
  const folder = sanitizeName(req.body.folder || "default");
  if (folder.includes("..") || folder.includes("/") || folder.includes("\\")) {
    return res.status(400).json({ message: "❌ Nama folder tidak valid" });
  }
  const vDir = path.join(videoRoot, folder);
  const aDir = path.join(audioRoot, folder);
  const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
  let playlist = { videos: [], audios: [] };
  if (fs.existsSync(vDir)) {
    playlist.videos = fs.readdirSync(vDir).filter((f) => f.endsWith(".mp4"));
  }
  if (fs.existsSync(aDir)) {
    playlist.audios = fs.readdirSync(aDir).filter((f) => f.endsWith(".mp3") || f.endsWith(".m4a"));
  }
  fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
  res.json({ message: "Folder & file berhasil diupload!", playlist, folder });
});

app.post("/folders/:name/files/upload", requireAuth, upload.single("file"), (req, res) => {
  const folder = sanitizeName(req.params.name);
  if (folder.includes("..")) {
    return res.status(400).json({ message: "❌ Nama folder tidak valid" });
  }
  const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
  let playlist = { videos: [], audios: [] };
  if (fs.existsSync(playlistPath)) {
    playlist = JSON.parse(fs.readFileSync(playlistPath, "utf-8"));
  }
  if (req.file.mimetype.startsWith("video/")) {
    if (!playlist.videos.includes(req.file.originalname)) {
      playlist.videos.push(req.file.originalname);
    }
  } else {
    if (!playlist.audios.includes(req.file.originalname)) {
      playlist.audios.push(req.file.originalname);
    }
  }
  fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
  res.json({ message: `File ${req.file.originalname} berhasil ditambahkan ke ${folder}`, playlist });
});

app.get("/folders", requireAuth, (req, res) => {
  const folders = [...new Set(fs.readdirSync(videoRoot))];
  res.json(folders);
});

app.get("/folders/:name/playlist", requireAuth, async (req, res) => {
  const folder = sanitizeName(req.params.name);
  if (folder.includes("..")) {
    return res.status(400).json({ message: "❌ Nama folder tidak valid" });
  }
  const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
  let playlist = { videos: [], audios: [] };
  if (fs.existsSync(playlistPath)) {
    playlist = JSON.parse(fs.readFileSync(playlistPath, "utf-8"));
  }
  const videoDurations = await Promise.all(
    playlist.videos.map((v) => getDuration(path.join(videoRoot, folder, v)))
  );
  const audioDurations = await Promise.all(
    playlist.audios.map((a) => getDuration(path.join(audioRoot, folder, a)))
  );
  const totalVideo = videoDurations.reduce((sum, d) => sum + d, 0);
  const totalAudio = audioDurations.reduce((sum, d) => sum + d, 0);
  res.json({ ...playlist, totalVideo, totalAudio, totalDuration: totalVideo + totalAudio });
});

app.put("/folders/:name/playlist", requireAuth, (req, res) => {
  const folder = sanitizeName(req.params.name);
  if (folder.includes("..")) {
    return res.status(400).json({ message: "❌ Nama folder tidak valid" });
  }
  const { videos, audios } = req.body;
  const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
  const playlist = {
    videos: Array.isArray(videos) ? videos : [],
    audios: Array.isArray(audios) ? audios : [],
  };
  try {
    fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
    return res.json({ message: "✅ Playlist diperbarui", playlist });
  } catch (err) {
    return res.status(500).json({ message: "❌ Gagal update playlist", error: err.message });
  }
});

app.delete("/folders/:name", requireAuth, (req, res) => {
  const folder = sanitizeName(req.params.name);
  if (folder.includes("..")) {
    return res.status(400).json({ message: "❌ Nama folder tidak valid" });
  }
  try {
    fs.rmSync(path.join(videoRoot, folder), { recursive: true, force: true });
    fs.rmSync(path.join(audioRoot, folder), { recursive: true, force: true });
    fs.rmSync(path.join(uploadRoot, `playlist_${folder}.json`), { force: true });
    return res.json({ message: `🗑️ Folder ${folder} berhasil dihapus` });
  } catch (err) {
    return res.status(500).json({ message: "❌ Gagal hapus folder", error: err.message });
  }
});

// ===== STREAMS API =====

// 🔹 Ambil semua streams
app.get("/streams", requireAuth, (req, res) => {
  try {
    const result = streams.map((s) => {
      let scheduleWIB = null;
      if (s.schedule) {
        try {
          const d = new Date(s.schedule);
          scheduleWIB = d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        } catch {
          scheduleWIB = s.schedule;
        }
      }
      return {
        ...s,
        scheduleInput: s.scheduleInput || null,
        scheduleWIB,
      };
    });
    return res.json(result);
  } catch (err) {
    console.error("❌ Gagal ambil streams:", err);
    return res.status(500).json({ message: "❌ Terjadi kesalahan server" });
  }
});

// 🔹 Ambil detail stream by ID
app.get("/streams/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const stream = streams.find((s) => s.id === id);

  if (!stream) {
    return res.status(404).json({ message: "❌ Stream tidak ditemukan" });
  }
  return res.json(stream);
});

// 🔹 Tambah stream baru
app.post("/streams", requireAuth, (req, res) => {
  try {
    const { name, platform, url, key, schedule, scheduleInput, duration, folder, channel } = req.body;

    // Validasi folder
    const sanitizedFolder = sanitizeName(folder);
    if (!sanitizedFolder || !fs.existsSync(path.join(videoRoot, sanitizedFolder))) {
      return res.status(400).json({ message: "❌ Folder tidak ditemukan, pilih folder yang valid" });
    }

    const stream = {
      id: Date.now(),
      name: name || "Untitled",
      platform: platform || "Unknown",
      url: url || "",
      key: key || "",
      schedule: schedule || null,
      scheduleInput: scheduleInput || null,
      duration: duration ? parseInt(duration, 10) : 0,
      folder: sanitizedFolder,
      channel: channel || "-", // ✅ channel ikut disimpan
      status: "Scheduled",
    };

    streams.push(stream);
    saveStreams();

    return res.json({
      message: "✅ Stream berhasil ditambahkan",
      stream,
    });
  } catch (err) {
    console.error("❌ Gagal tambah stream:", err);
    return res.status(500).json({ message: "❌ Terjadi kesalahan server" });
  }
});

// 🔹 Update stream
app.put("/streams/:id", requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const stream = streams.find((s) => s.id === id);

    if (!stream) {
      return res.status(404).json({ message: "❌ Stream tidak ditemukan" });
    }

    const { name, platform, url, key, schedule, scheduleInput, duration, folder, channel } = req.body;

    if (name) stream.name = name;
    if (platform) stream.platform = platform;
    if (url) stream.url = url;
    if (key) stream.key = key;
    if (schedule) {
      stream.schedule = schedule;
      stream.status = "Scheduled"; // reset status kalau jadwal berubah
    }
    if (scheduleInput) stream.scheduleInput = scheduleInput;
    if (duration) stream.duration = parseInt(duration, 10);
    if (folder) stream.folder = sanitizeName(folder);
    if (channel !== undefined) stream.channel = channel; // ✅ update channel

    saveStreams();

    return res.json({
      message: `✅ Stream ${id} berhasil diperbarui`,
      stream,
    });
  } catch (err) {
    console.error("❌ Gagal update stream:", err);
    return res.status(500).json({ message: "❌ Terjadi kesalahan server" });
  }
});

// ===== FFmpeg Start (Versi Perbaikan dengan pre-merge audio) =====
function updateStreamStatus(id, status, message) {
  const stream = streams.find(s => s.id === id);
  if (stream) {
    stream.status = status;
    stream.message = message;
    saveStreams();
  }
}

function startFFmpeg(id, folder, rtmpUrl, duration) {
  const videoDir = path.join(videoRoot, folder);
  const audioDir = path.join(audioRoot, folder);
  const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
  const mergedAudioPath = path.join(tempDir, `merged_audio_${id}.aac`);
  const tempVideoListPath = path.join(tempDir, `video_list_${id}.txt`);
  const tempAudioListPath = path.join(tempDir, `audio_list_${id}.txt`);
  const tempFixedAudioFiles = [];

  const stream = streams.find((s) => s.id === id);
  if (!stream) {
    console.error(`❌ Stream dengan ID ${id} tidak ditemukan.`);
    return;
  }
  if (!fs.existsSync(playlistPath)) {
    console.error(`❌ Playlist ${playlistPath} tidak ditemukan.`);
    updateStreamStatus(id, "Failed", "Gagal: Playlist tidak ditemukan");
    return;
  }
  
  // Fungsi untuk membersihkan semua file sementara
  function cleanupTempFiles() {
    console.log(`🗑️ Membersihkan file sementara untuk stream ${id}...`);
    try {
      fs.unlinkSync(tempVideoListPath);
    } catch (e) { /* ignore */ }
    try {
      fs.unlinkSync(tempAudioListPath);
    } catch (e) { /* ignore */ }
    try {
      fs.unlinkSync(mergedAudioPath);
    } catch (e) { /* ignore */ }
    tempFixedAudioFiles.forEach(f => {
      try {
        fs.unlinkSync(f);
      } catch (e) { /* ignore */ }
    });
    console.log(`✅ Pembersihan selesai.`);
  }

  // --- START PERSIAPAN (status Preparing) ---
  updateStreamStatus(id, "Preparing", "Memulai persiapan stream...");

  const playlist = JSON.parse(fs.readFileSync(playlistPath, "utf-8"));
  const videoFiles = playlist.videos || [];
  const audioFiles = playlist.audios || [];

  if (videoFiles.length === 0) {
    console.error("❌ Tidak ada file video di playlist.");
    updateStreamStatus(id, "Failed", "Gagal: Tidak ada video di playlist");
    return;
  }
  
  // Tulis daftar video
  const videoListContent = videoFiles
    .map((f) => `file ${escapeShellArg(path.join(videoDir, f))}`)
    .join("\n");
  fs.writeFileSync(tempVideoListPath, videoListContent);
  
  // Jika ada file audio, lakukan konversi dan merge
  if (audioFiles.length > 0) {
    updateStreamStatus(id, "Preparing", `Mengonversi ${audioFiles.length} file audio...`);
    for (const f of audioFiles) {
      const src = path.join(audioDir, f);
      if (!fs.existsSync(src)) {
        console.error(`❌ File audio tidak ditemukan, dilewati: ${src}`);
        continue;
      }
      const fixed = path.join(tempDir, `${path.parse(f).name}_fixed.aac`);
      try {
        execSync(`ffmpeg -y -i ${escapeShellArg(src)} -ar 44100 -ac 2 -c:a aac ${escapeShellArg(fixed)}`);
        tempFixedAudioFiles.push(fixed);
      } catch (err) {
        console.error(`❌ Gagal convert file ${f}, dilewati:`, err.message);
      }
    }
    
    // Jika tidak ada file audio yang berhasil dikonversi, batalkan proses
    if (tempFixedAudioFiles.length === 0) {
      console.error("❌ Tidak ada file audio yang berhasil dikonversi. Stream dibatalkan.");
      updateStreamStatus(id, "Failed", "Gagal: Semua audio gagal dikonversi");
      cleanupTempFiles();
      return;
    }

    // Tulis daftar audio yang sudah diperbaiki
    const fixedAudioListContent = tempFixedAudioFiles
      .map((f) => `file ${escapeShellArg(f)}`)
      .join("\n");
    fs.writeFileSync(tempAudioListPath, fixedAudioListContent);
    
    // PERUBAHAN: Ganti status menjadi "Merging"
    updateStreamStatus(id, "Merging", "Menggabungkan audio...");
    
    try {
      // Merge audio menggunakan -c copy agar lebih cepat
      execSync(`ffmpeg -y -f concat -safe 0 -i ${escapeShellArg(tempAudioListPath)} -c:a copy ${escapeShellArg(mergedAudioPath)}`);
    } catch (err) {
      console.error("❌ Gagal menggabungkan audio:", err.message);
      updateStreamStatus(id, "Failed", "Gagal: Menggabungkan audio");
      cleanupTempFiles();
      return;
    }
  }

  // --- START STREAM (status Running) ---
  let args;
  if (audioFiles.length > 0) {
    args = [
      "-re",
      "-stream_loop",
      "-1",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      tempVideoListPath,
      "-re",
      "-stream_loop",
      "-1",
      "-i",
      mergedAudioPath,
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-f",
      "flv",
      rtmpUrl,
    ];
  } else {
    args = [
      "-re",
      "-stream_loop",
      "-1",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      tempVideoListPath,
      "-c:v",
      "copy",
      "-an",
      "-f",
      "flv",
      rtmpUrl,
    ];
  }

  updateStreamStatus(id, "Running", "Streaming dimulai");
  stream.startTime = new Date().toISOString();
  stream.endTime = Date.now() + duration * 60 * 1000;
  stream.stopType = null;
  stream.stopDuration = null;
  saveStreams();
  manualStop[id] = false;

  console.log(`▶️ Jalankan FFmpeg untuk stream ${id}`);
  const ffmpeg = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  processes[id] = ffmpeg;
  const logPath = path.join(logDir, `stream_${id}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: "w" });
  ffmpeg.stdout.pipe(logStream);
  ffmpeg.stderr.pipe(logStream);

   // --- EVENT CLOSE (penanganan file) ---
  ffmpeg.on("close", (code) => {
    console.log(`⏹ FFmpeg berhenti untuk stream ${id} (code ${code})`);

    const stream = streams.find((s) => s.id === id);
    if (!stream) {
      cleanupTempFiles();
      delete processes[id];
      delete manualStop[id];
      return;
    }

    if (manualStop[id]) {
      // Stop manual → jangan auto-retry
      cleanupTempFiles();
      delete processes[id];
      delete manualStop[id];
      return;
    }

    const now = Date.now();
    const durationInSeconds = Math.floor((now - new Date(stream.startTime).getTime()) / 1000);

    if (now >= stream.endTime) {
      // Durasi habis → stream selesai normal, tidak auto-retry
      stream.status = "Stopped";
      stream.stopType = "timeout";
      stream.stopDuration = durationInSeconds;
      stream.message = "Stream berakhir sesuai jadwal";
      saveStreams();
      cleanupTempFiles();
    } else {
      // Kalau berhenti sebelum waktunya → anggap error → auto-retry
      console.log(`🔄 Auto-retry stream ${id}`);
      const rtmpUrl = `${stream.url}/${stream.key}`;
      const remaining = (stream.endTime - now) / 60000;
      startFFmpeg(id, stream.folder, rtmpUrl, remaining);
    }

    delete processes[id];
  });
  
  if (duration && duration > 0) {
    timeouts[id] = setTimeout(() => {
      stopStream(id);
    }, duration * 60 * 1000);
  }
}

// ===== Scheduler =====
setInterval(() => {
  const now = new Date();
  streams.forEach((s) => {
    // Cek hanya untuk stream Scheduled + ada jadwal + bukan stop manual
    if (s.status === "Scheduled" && s.schedule) {
      const scheduleTime = new Date(s.schedule);
      if (scheduleTime <= now && !processes[s.id]) {
        const rtmpUrl = `${s.url}/${s.key}`;
        console.log(`⏰ Auto start stream ${s.id} (${s.name})`);
        startFFmpeg(s.id, s.folder, rtmpUrl, s.duration);
      }
    }
  });
}, 30000);

// ===== Manual Start/Stop/Restart/Delete =====
app.put("/streams/:id/start", requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const stream = streams.find((s) => s.id === id);
  if (!stream) return res.status(404).json({ message: "Stream tidak ditemukan" });
  if (processes[id]) return res.status(400).json({ message: "Stream sudah berjalan" });

  const rtmpUrl = `${stream.url}/${stream.key}`;
  startFFmpeg(id, stream.folder, rtmpUrl, stream.duration);
  res.json({ message: `▶️ Stream ${id} dijalankan`, stream });
});

app.put("/streams/:id/stop", requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  stopStream(id);

  const stream = streams.find((s) => s.id === id);
  if (stream) {
    stream.status = "Stopped";
    stream.stopType = "manual";
    stream.message = "Stream dihentikan manual";
    saveStreams();
  }

  res.json({ message: `⏹️ Stream ${id} dihentikan` });
});

app.put("/streams/:id/restart", requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const stream = streams.find((s) => s.id === id);
  if (!stream) return res.status(404).json({ message: "Stream tidak ditemukan" });

  stopStream(id);

  const remaining =
    stream.endTime && Date.now() < stream.endTime
      ? (stream.endTime - Date.now()) / 60000
      : stream.duration;

  const rtmpUrl = `${stream.url}/${stream.key}`;
  startFFmpeg(id, stream.folder, rtmpUrl, remaining);

  res.json({ message: `🔄 Stream ${id} direstart`, stream });
});

app.delete("/streams/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  stopStream(id);
  streams = streams.filter((s) => s.id !== id);
  saveStreams();
  res.json({ message: "🗑️ Stream dihapus" });
});

// ===== Status API =====
app.get("/status", requireAuth, (req, res) => {
  const folders = fs.readdirSync(videoRoot);
  let totalVideos = 0, totalAudios = 0;

  folders.forEach((f) => {
    const vDir = path.join(videoRoot, f);
    const aDir = path.join(audioRoot, f);
    if (fs.existsSync(vDir)) totalVideos += fs.readdirSync(vDir).length;
    if (fs.existsSync(aDir)) totalAudios += fs.readdirSync(aDir).length;
  });

  res.json({
    uptime: process.uptime(),
    totalFolders: folders.length,
    totalVideos,
    totalAudios,
    activeStreams: streams.filter((s) => s.status === "Running").length,
    scheduledStreams: streams.filter((s) => s.status === "Scheduled").length,
  });
});

// ===== Server Monitoring =====
app.get("/server-stats", requireAuth, (req, res) => {
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const uptime = os.uptime();
  const load = os.loadavg()[0];
  const cores = os.cpus().length;
  const cpuPercent = (load / cores) * 100;
  let storageUsed = 0, storageTotal = 0;
  try {
    const output = execSync("df -k --output=used,size / | tail -1").toString().trim().split(/\s+/);
    storageUsed = parseInt(output[0]) * 1024; // byte
    storageTotal = parseInt(output[1]) * 1024; // byte
  } catch (err) {
    console.error("❌ Gagal ambil info storage:", err.message);
  }
  res.json({
    cpuLoad: cpuPercent.toFixed(2),
    memoryUsed: (((memTotal - memFree) / memTotal) * 100).toFixed(2),
    memoryFree: (memFree / 1024 / 1024).toFixed(0) + " MB",
    memoryTotal: (memTotal / 1024 / 1024).toFixed(0) + " MB",
    uptime: Math.round(uptime / 60) + " menit",
    storageUsedPercent: storageTotal ? ((storageUsed / storageTotal) * 100).toFixed(2) : "0",
    storageUsed: (storageUsed / 1024 / 1024 / 1024).toFixed(2) + " GB",
    storageTotal: (storageTotal / 1024 / 1024 / 1024).toFixed(2) + " GB",
  });
});

// ===== IMPORT FILE ke STREAM FOLDER =====
const externalRoot = "/var/www/uploads_external";
fs.mkdirSync(externalRoot, { recursive: true });

app.post("/import-to-stream-folder", requireAuth, (req, res) => {
  const { source, targetFolder } = req.body;
  const srcPath = path.join(externalRoot, source);
  const destDir = path.join(videoRoot, sanitizeName(targetFolder));
  if (!fs.existsSync(srcPath) || !fs.existsSync(destDir)) {
    return res.status(404).json({ message: "❌ File sumber atau folder tujuan tidak ditemukan" });
  }
  const destPath = path.join(destDir, path.basename(srcPath));
  try {
    fs.copyFileSync(srcPath, destPath);
    const playlistPath = path.join(uploadRoot, `playlist_${sanitizeName(targetFolder)}.json`);
    let playlist = { videos: [], audios: [] };
    if (fs.existsSync(playlistPath)) {
      playlist = JSON.parse(fs.readFileSync(playlistPath, "utf-8"));
    }
    if (!playlist.videos.includes(path.basename(srcPath))) {
      playlist.videos.push(path.basename(srcPath));
    }
    fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
    return res.json({ message: `✅ File ${path.basename(srcPath)} berhasil diimport ke ${targetFolder}`, playlist });
  } catch (err) {
    return res.status(500).json({ message: "❌ Gagal import file", error: err.message });
  }
});

// ===== CLEAN FOLDER =====
app.post("/folders/:name/clean", requireAuth, (req, res) => {
  const folder = sanitizeName(req.params.name);
  const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
  if (!fs.existsSync(playlistPath)) {
    return res.status(404).json({ message: "❌ Playlist tidak ditemukan" });
  }
  const playlist = JSON.parse(fs.readFileSync(playlistPath, "utf-8"));
  const keepVideos = new Set(playlist.videos || []);
  const keepAudios = new Set(playlist.audios || []);
  const videoDir = path.join(videoRoot, folder);
  const audioDir = path.join(audioRoot, folder);
  let deleted = { videos: [], audios: [] };
  if (fs.existsSync(videoDir)) {
    fs.readdirSync(videoDir).forEach((f) => {
      if (!keepVideos.has(f)) {
        fs.unlinkSync(path.join(videoDir, f));
        deleted.videos.push(f);
      }
    });
  }
  if (fs.existsSync(audioDir)) {
    fs.readdirSync(audioDir).forEach((f) => {
      if (!keepAudios.has(f)) {
        fs.unlinkSync(path.join(audioDir, f));
        deleted.audios.push(f);
      }
    });
  }
  res.json({ message: "✅ Folder dibersihkan", deleted, keepVideos: [...keepVideos], keepAudios: [...keepAudios] });
});

// ===== IMPORT VIDEO REPLACE =====
app.post("/import-video-replace", requireAuth, (req, res) => {
  const { source, targetFolder } = req.body;
  const folder = sanitizeName(targetFolder);
  const srcPath = path.join(externalRoot, source);
  const destDir = path.join(videoRoot, folder);
  if (!fs.existsSync(srcPath) || !fs.existsSync(destDir)) {
    return res.status(404).json({ message: "❌ File sumber atau folder tujuan tidak ditemukan" });
  }
  try {
    const destPath = path.join(destDir, path.basename(srcPath));
    fs.renameSync(srcPath, destPath);
    const playlistPath = path.join(uploadRoot, `playlist_${folder}.json`);
    let playlist = { videos: [], audios: [] };
    if (fs.existsSync(playlistPath)) {
      playlist = JSON.parse(fs.readFileSync(playlistPath, "utf-8"));
    }
    const oldVideos = new Set(playlist.videos);
    playlist.videos = [path.basename(srcPath)];
    fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
    const deleted = [];
    fs.readdirSync(destDir).forEach((f) => {
      if (oldVideos.has(f)) {
        fs.unlinkSync(path.join(destDir, f));
        deleted.push(f);
      }
    });
    return res.json({ message: `✅ File ${path.basename(srcPath)} dipindahkan & video lama dibersihkan`, deleted });
  } catch (err) {
    return res.status(500).json({ message: "❌ Gagal import file", error: err.message });
  }
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
});

// ===== Run Server =====
setupUserFile()
  .then(() => {
    // app.listen(PORT, "0.0.0.0", () => {
    //   console.log(`✅ Server jalan di http://0.0.0.0:${PORT}`);
    // });
    app.listen(PORT, "localhost", () => {
      console.log(`✅ Server jalan di http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Gagal memulai server:", err);
  });
