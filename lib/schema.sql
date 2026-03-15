CREATE DATABASE IF NOT EXISTS `whatsapp-message`;
USE `whatsapp-message`;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT 'Administrator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wa_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(255) DEFAULT 'default',
  status ENUM('disconnected', 'qr_pending', 'connected') DEFAULT 'disconnected',
  connected_phone VARCHAR(50) NULL,
  connected_name VARCHAR(255) NULL,
  connected_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wa_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wa_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  push_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT NULL,
  is_group BOOLEAN DEFAULT FALSE,
  last_message TEXT NULL,
  last_message_time TIMESTAMP NULL,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wa_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  contact_wa_id VARCHAR(100) NOT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  body TEXT,
  media_url TEXT NULL,
  media_type VARCHAR(50) NULL,
  timestamp BIGINT,
  status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact (contact_wa_id),
  INDEX idx_timestamp (timestamp)
);
