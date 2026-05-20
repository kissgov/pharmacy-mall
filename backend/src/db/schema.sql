-- 药店网上商城数据库 Schema
-- MySQL DDL，共 14 张表（云托管 CynosDB 兼容）
-- 注意：MySQL 严格模式下 TEXT/BLOB 不能有默认值，
-- 云数据库不支持外键约束（应用层保证引用完整性）

CREATE DATABASE IF NOT EXISTS pharmacy_mall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pharmacy_mall;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(255) NOT NULL UNIQUE,
  nickname VARCHAR(100),
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  member_level VARCHAR(20) DEFAULT 'normal',
  points INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户收货地址
CREATE TABLE IF NOT EXISTS user_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province VARCHAR(50),
  city VARCHAR(50),
  district VARCHAR(50),
  detail VARCHAR(255),
  is_default TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品分类
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  parent_id INT,
  icon VARCHAR(50),
  sort INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品/药品
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  images TEXT,
  specification VARCHAR(200),
  brand VARCHAR(100),
  manufacturer VARCHAR(200),
  price DECIMAL(10,2) NOT NULL,
  member_price DECIMAL(10,2),
  stock INT DEFAULT 0,
  is_prescription TINYINT DEFAULT 0,
  usage_dosage TEXT,
  contraindications TEXT,
  approval_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'on',
  sales INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 购物车
CREATE TABLE IF NOT EXISTS carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  UNIQUE KEY uq_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 优惠券（必须在 orders 之前创建，订单引用优惠券）
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) DEFAULT 'full_reduction',
  value DECIMAL(10,2) NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  total_count INT,
  received_count INT DEFAULT 0,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  address_snapshot TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  freight DECIMAL(10,2) DEFAULT 0,
  pay_amount DECIMAL(10,2) NOT NULL,
  coupon_id INT,
  payment_method VARCHAR(20) DEFAULT 'wechat',
  paid_at DATETIME,
  tracking_no VARCHAR(100),
  logistics_company VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单明细
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_image VARCHAR(500),
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 管理员用户（必须在 prescriptions 之前）
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 处方
CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  images TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  reviewer_id INT,
  review_remark TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户优惠券
CREATE TABLE IF NOT EXISTS user_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coupon_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'unused',
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用药提醒
CREATE TABLE IF NOT EXISTS medication_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  drug_name VARCHAR(200) NOT NULL,
  dosage VARCHAR(200),
  frequency VARCHAR(100),
  time VARCHAR(100),
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品评价
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT NOT NULL,
  content TEXT,
  images TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Banner 轮播
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500),
  sort INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
