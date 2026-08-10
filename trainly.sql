-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 10/08/2026 às 05:20
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
CREATE DATABASE IF NOT EXISTS `trainly` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `trainly`;
-- --------------------------------------------------------

--
-- Estrutura para tabela `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(30) NOT NULL DEFAULT 'Corrida',
  `title` varchar(255) DEFAULT NULL,
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

INSERT INTO `activities` (`id`, `user_id`, `type`, `title`, `date`, `distance_km`, `duration_sec`, `heart_rate`, `elevation_m`, `xp_earned`) VALUES
(1, 1, 'Corrida', 'ccccccc', '2026-08-09 23:56:23', 10, 4020, 19, 22, 167),
(2, 1, 'Ciclismo', 'teste', '2026-08-10 00:02:48', 50, 7200, 160, 40, 620),
(3, 1, 'Natação', 'teste', '2026-08-10 00:03:02', 222, 1320, 222, 22, 2242),
(4, 1, 'Caminhada', 'teste', '2026-08-10 00:03:33', 222, 1320, 22, 22, 2242),
(5, 1, 'Ciclismo', 'ddd', '2026-08-10 00:03:45', 33, 1980, 33, 3, 363);

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
(1, 1, 1, '2026-08-10 02:56:28');

-- --------------------------------------------------------

--
-- Estrutura para tabela `following`
--

CREATE TABLE `following` (
  `user_id` int(11) NOT NULL,
  `followed_name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
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

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `xp`, `monthly_goal_km`, `last_daily_reward`, `created_at`) VALUES
(1, 'Miguel Bizerra Silva', 'teste@gmail.com', '$2y$10$SQ4C4rq3.3ONkR5QCuciguyCNh/wmejFL1bDOJK4HdlRLtoBkZ58m', 5674, 100, '2026-08-10', '2026-08-09 16:56:38');

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
-- Índices de tabela `following`
--
ALTER TABLE `following`
  ADD PRIMARY KEY (`user_id`,`followed_name`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `activity_likes`
--
ALTER TABLE `activity_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- Restrições para tabelas `following`
--
ALTER TABLE `following`
  ADD CONSTRAINT `following_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
