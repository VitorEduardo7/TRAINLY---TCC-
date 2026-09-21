-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 16/09/2026 às 23:21
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `trainly`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(30) NOT NULL DEFAULT 'Corrida',
  `title` varchar(255) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `date` datetime NOT NULL,
  `distance_km` float NOT NULL,
  `duration_sec` int(11) NOT NULL,
  `heart_rate` int(11) DEFAULT NULL,
  `elevation_m` int(11) DEFAULT NULL,
  `xp_earned` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `activities`
--

INSERT INTO `activities` (`id`, `user_id`, `type`, `title`, `photo_path`, `date`, `distance_km`, `duration_sec`, `heart_rate`, `elevation_m`, `xp_earned`) VALUES
(1, 1, 'Corrida', 'ccccccc', NULL, '2026-08-09 23:56:23', 10, 4020, 19, 22, 167),
(2, 1, 'Ciclismo', 'teste', NULL, '2026-08-10 00:02:48', 50, 7200, 160, 40, 620),
(3, 1, 'Natação', 'teste', NULL, '2026-08-10 00:03:02', 222, 1320, 222, 22, 2242),
(4, 1, 'Caminhada', 'teste', NULL, '2026-08-10 00:03:33', 222, 1320, 22, 22, 2242),
(5, 1, 'Ciclismo', 'ddd', NULL, '2026-08-10 00:03:45', 33, 1980, 33, 3, 363),
(6, 1, 'Corrida', 'jjj', NULL, '2026-09-06 00:14:32', 33, 1980, 33, 3, 363),
(7, 1, 'Natação', 'aaaa', NULL, '2026-09-06 19:41:33', 22, 1320, 2, 2, 242),
(8, 2, 'Corrida', 'fffffffff', NULL, '2026-09-06 22:46:31', 222, 1320, 2, 2, 2242),
(9, 1, 'Corrida', 'teste', 'uploads/activities/2c0bf9b3256f630c172a609e5836f109.png', '2026-09-13 22:01:27', 222, 1980, 22, 33, 2253),
(10, 1, 'Corrida', 'ccccccc', 'uploads/activities/4cdc3e4a54053af614e3533cd69941d4.png', '2026-09-13 22:07:10', 2222, 120, 2, 2, 22222);

-- --------------------------------------------------------

--
-- Estrutura para tabela `activity_likes`
--

CREATE TABLE `activity_likes` (
  `id` int(11) NOT NULL,
  `activity_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `activity_likes`
--

INSERT INTO `activity_likes` (`id`, `activity_id`, `user_id`, `created_at`) VALUES
(1, 1, 1, '2026-08-10 02:56:28'),
(5, 7, 3, '2026-09-14 01:17:31'),
(7, 6, 3, '2026-09-14 01:20:40'),
(8, 5, 3, '2026-09-14 01:20:41'),
(10, 10, 1, '2026-09-16 20:58:32'),
(11, 9, 1, '2026-09-16 20:58:34'),
(12, 8, 1, '2026-09-16 20:58:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `clubs`
--

CREATE TABLE `clubs` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(280) DEFAULT NULL,
  `invite_code` varchar(12) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `clubs`
--

INSERT INTO `clubs` (`id`, `name`, `description`, `invite_code`, `created_by`, `created_at`) VALUES
(1, 'aaaaaaaaaaaa', 'aaaaaaaa', '2E0CA5C3', 1, '2026-09-07 01:13:56'),
(2, 'palmeiras', 'irbifnujro', 'C93E8508', 1, '2026-09-16 21:20:20');

-- --------------------------------------------------------

--
-- Estrutura para tabela `club_challenges`
--

CREATE TABLE `club_challenges` (
  `id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `club_challenges`
--

INSERT INTO `club_challenges` (`id`, `club_id`, `title`, `start_date`, `end_date`, `created_by`, `created_at`) VALUES
(1, 1, 'llllllllllllllllllll', '2026-09-14', '2026-10-14', 1, '2026-09-14 01:05:50');

-- --------------------------------------------------------

--
-- Estrutura para tabela `club_members`
--

CREATE TABLE `club_members` (
  `club_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `club_members`
--

INSERT INTO `club_members` (`club_id`, `user_id`, `joined_at`) VALUES
(1, 1, '2026-09-07 01:13:56'),
(2, 1, '2026-09-16 21:20:20');

-- --------------------------------------------------------

--
-- Estrutura para tabela `following`
--

CREATE TABLE `following` (
  `user_id` int(11) NOT NULL,
  `followed_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `following`
--

INSERT INTO `following` (`user_id`, `followed_user_id`, `created_at`) VALUES
(1, 2, '2026-09-14 01:06:44'),
(2, 1, '2026-09-07 01:44:53'),
(3, 1, '2026-09-14 01:14:02');

-- --------------------------------------------------------

--
-- Estrutura para tabela `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `actor_id` int(11) NOT NULL,
  `type` varchar(20) NOT NULL,
  `activity_id` int(11) DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `actor_id`, `type`, `activity_id`, `read_at`, `created_at`) VALUES
(1, 2, 1, 'like', 8, NULL, '2026-09-14 01:01:47'),
(2, 2, 1, 'follow', NULL, NULL, '2026-09-14 01:06:38'),
(3, 2, 1, 'follow', NULL, NULL, '2026-09-14 01:06:44'),
(4, 1, 3, 'follow', NULL, NULL, '2026-09-14 01:14:02'),
(5, 1, 3, 'like', 10, NULL, '2026-09-14 01:17:30'),
(6, 1, 3, 'like', 7, NULL, '2026-09-14 01:17:31'),
(7, 1, 3, 'like', 6, NULL, '2026-09-14 01:17:32'),
(8, 1, 3, 'like', 6, NULL, '2026-09-14 01:20:40'),
(9, 1, 3, 'like', 5, NULL, '2026-09-14 01:20:41'),
(10, 1, 3, 'like', 4, NULL, '2026-09-14 01:20:41'),
(11, 2, 1, 'like', 8, NULL, '2026-09-16 20:58:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `routes`
--

CREATE TABLE `routes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` varchar(30) NOT NULL DEFAULT 'Corrida',
  `difficulty` varchar(30) NOT NULL DEFAULT 'Iniciante',
  `terrain` varchar(60) DEFAULT NULL,
  `distance_km` float NOT NULL,
  `elevation_m` int(11) NOT NULL DEFAULT 0,
  `rating_avg` decimal(2,1) DEFAULT NULL,
  `rating_count` int(11) NOT NULL DEFAULT 0,
  `start_lat` decimal(10,7) NOT NULL,
  `start_lng` decimal(10,7) NOT NULL,
  `path_json` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `routes`
--

INSERT INTO `routes` (`id`, `user_id`, `name`, `type`, `difficulty`, `terrain`, `distance_km`, `elevation_m`, `rating_avg`, `rating_count`, `start_lat`, `start_lng`, `path_json`, `created_at`) VALUES
(2, 1, 'aaaaaa', 'Ciclismo', 'Avançado', 'dfwgfd', 2176.43, 21213, NULL, 0, -23.3560461, -46.5756798, '[[-23.35604613825412,-46.57567977905274],[-6.271618064314864,-36.65039062500001]]', '2026-09-16 21:15:12');

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `bio` varchar(280) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `cover_photo` varchar(255) DEFAULT NULL,
  `avatar_photo` varchar(255) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `xp` int(11) NOT NULL DEFAULT 0,
  `monthly_goal_km` int(11) NOT NULL DEFAULT 100,
  `last_daily_reward` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `users`
--

INSERT INTO `users` (`id`, `name`, `bio`, `location`, `cover_photo`, `avatar_photo`, `email`, `password_hash`, `xp`, `monthly_goal_km`, `last_daily_reward`, `created_at`) VALUES
(1, 'Miguel', 'ai dento', 'Ribeirão Pires , SP', 'uploads/covers/cover_1_793275cf0a9cf47c.jpg', 'uploads/avatars/avatar_1_b509df4d0a60a115.jpg', 'teste@gmail.com', '$2y$10$SQ4C4rq3.3ONkR5QCuciguyCNh/wmejFL1bDOJK4HdlRLtoBkZ58m', 30814, 100, '2026-09-07', '2026-08-09 16:56:38'),
(2, 'martin odegard', NULL, NULL, NULL, NULL, 'abc@gmail.com', '$2y$10$ncqyxYnZR91RVp0ZDZBUpOHiWQmFvgXswfHVomEEiP4zgJcpbLSQm', 2242, 100, NULL, '2026-09-07 01:44:31'),
(3, 'Miguel Bizerra Silva', NULL, NULL, NULL, NULL, 'bizerrasilvamiguel@gmail.com', '$2y$10$o/hq2RUJx90BSIWyLZrD4OxCnhThBNemSS2pewigU.Gx3j6McLs6.', 0, 100, NULL, '2026-09-14 01:12:19');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_date` (`user_id`,`date`);

--
-- Índices de tabela `activity_likes`
--
ALTER TABLE `activity_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_like` (`activity_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices de tabela `clubs`
--
ALTER TABLE `clubs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invite_code` (`invite_code`),
  ADD KEY `created_by` (`created_by`);

--
-- Índices de tabela `club_challenges`
--
ALTER TABLE `club_challenges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `club_id` (`club_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Índices de tabela `club_members`
--
ALTER TABLE `club_members`
  ADD PRIMARY KEY (`club_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices de tabela `following`
--
ALTER TABLE `following`
  ADD PRIMARY KEY (`user_id`,`followed_user_id`),
  ADD KEY `followed_user_id` (`followed_user_id`);

--
-- Índices de tabela `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `actor_id` (`actor_id`),
  ADD KEY `activity_id` (`activity_id`),
  ADD KEY `idx_user_created` (`user_id`,`created_at`);

--
-- Índices de tabela `routes`
--
ALTER TABLE `routes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `activities`
--
ALTER TABLE `activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de tabela `activity_likes`
--
ALTER TABLE `activity_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de tabela `clubs`
--
ALTER TABLE `clubs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `club_challenges`
--
ALTER TABLE `club_challenges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `routes`
--
ALTER TABLE `routes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `activities`
--
ALTER TABLE `activities`
  ADD CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `activity_likes`
--
ALTER TABLE `activity_likes`
  ADD CONSTRAINT `activity_likes_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `activity_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `clubs`
--
ALTER TABLE `clubs`
  ADD CONSTRAINT `clubs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `club_challenges`
--
ALTER TABLE `club_challenges`
  ADD CONSTRAINT `club_challenges_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_challenges_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `club_members`
--
ALTER TABLE `club_members`
  ADD CONSTRAINT `club_members_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `following`
--
ALTER TABLE `following`
  ADD CONSTRAINT `following_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `following_ibfk_2` FOREIGN KEY (`followed_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `routes`
--
ALTER TABLE `routes`
  ADD CONSTRAINT `routes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
