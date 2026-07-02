-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 02, 2026 at 08:07 AM
-- Server version: 8.0.30
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_pimora`
--

-- --------------------------------------------------------

--
-- Table structure for table `email_verifications`
--

CREATE TABLE `email_verifications` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `email_verifications`
--

INSERT INTO `email_verifications` (`id`, `user_id`, `token`, `expires_at`, `used`, `created_at`) VALUES
(5, 4, '8b0415a5b5841c2408170997a097fd4edad023629eec3f7752a87e6c926e40d7', '2025-10-13 19:13:48', 1, '2025-10-12 12:13:48'),
(9, 8, '62c491e76e39afcc4402d061045cb634bc55d753f7869b40a422230b0e815559', '2026-06-30 15:35:29', 1, '2026-06-29 08:35:28'),
(10, 9, '30243d1b1596a439ab4fa375fecd814f1fcb8dbae0da948b561628775f59b40c', '2026-07-03 15:05:27', 1, '2026-07-02 08:05:27');

-- --------------------------------------------------------

--
-- Table structure for table `packages`
--

CREATE TABLE `packages` (
  `id` int NOT NULL,
  `code` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `type` enum('harian','bulanan') NOT NULL,
  `price` int NOT NULL DEFAULT '0',
  `video_quota` int NOT NULL,
  `max_duration_minutes` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `packages`
--

INSERT INTO `packages` (`id`, `code`, `title`, `type`, `price`, `video_quota`, `max_duration_minutes`, `created_at`, `updated_at`) VALUES
(1, 'H1', 'Harian: 1 video — max 2 jam', 'harian', 10000, 1, 120, '2025-10-14 06:50:42', '2025-10-14 06:51:21'),
(2, 'H2', 'Harian: 2 video — max 4 jam', 'harian', 20000, 2, 240, '2025-10-14 06:50:42', '2025-10-14 06:51:27'),
(3, 'H3', 'Harian: 3 video — max 6 jam', 'harian', 30000, 3, 360, '2025-10-14 06:50:42', '2025-10-14 06:51:32'),
(4, 'M150', 'Bulanan: 15 video — max 4 jam', 'bulanan', 150000, 15, 240, '2025-10-14 06:50:42', '2025-10-14 06:50:42'),
(5, 'M250', 'Bulanan: 30 video — max 6 jam', 'bulanan', 250000, 30, 360, '2025-10-14 06:50:42', '2025-10-14 06:50:42'),
(6, 'M400', 'Bulanan: 50 video — max 12 jam', 'bulanan', 400000, 50, 720, '2025-10-14 06:50:42', '2025-10-14 06:50:42');

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `package_id` int NOT NULL,
  `price_paid` int NOT NULL,
  `payment_method` enum('bank_transfer','qris','dana','ovo','manual') NOT NULL,
  `payment_status` enum('pending','paid','failed') NOT NULL DEFAULT 'pending',
  `payment_meta` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `package_id` int DEFAULT NULL,
  `streams_remaining` int DEFAULT '0',
  `max_duration_hours` int DEFAULT '0',
  `package_expiry` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `username`, `name`, `password_hash`, `is_verified`, `created_at`, `package_id`, `streams_remaining`, `max_duration_hours`, `package_expiry`) VALUES
(4, 'hanissiddiq@gmail.com', NULL, 'hanis', '$2b$12$M0eEKsY/SpZRIH/iShHlqeHeUs.eoKyXo0troH/Tk7AtgDyMS62qO', 1, '2025-10-12 12:13:48', NULL, 0, 0, NULL),
(8, 'hanis.siddiq44@guru.sma.belajar.id', NULL, 'hanis', '$2b$12$ld/ccQ2WuHj0Ja5LKdsXxuBZpRje.gaWApctySrs6eIvitLwT8Rv2', 1, '2026-06-29 08:35:28', NULL, 0, 0, NULL),
(9, 'hanissiddiq10@gmail.com', NULL, 'hanis', '$2b$12$JNNKh3a132o8pz6yfuF1FedKWIazSlW5NXlXVc6Cq5LwC2DupMKNe', 1, '2026-07-02 08:05:27', NULL, 0, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_packages`
--

CREATE TABLE `user_packages` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `package_id` int NOT NULL,
  `remaining_videos` int NOT NULL,
  `max_duration_minutes` int NOT NULL,
  `expired_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `fk_ev_user` (`user_id`);

--
-- Indexes for table `packages`
--
ALTER TABLE `packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_id` (`package_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_packages`
--
ALTER TABLE `user_packages`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `email_verifications`
--
ALTER TABLE `email_verifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `packages`
--
ALTER TABLE `packages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `user_packages`
--
ALTER TABLE `user_packages`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD CONSTRAINT `fk_ev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
