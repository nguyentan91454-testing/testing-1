# 🛍️ TechStore — E-Commerce SPA Full-Stack với AI Chatbot

> **Production-ready** Web thương mại điện tử SPA đầy đủ chức năng với React 19 + TypeScript + Node.js + Express + Prisma + AI Chatbot Tool Calling (Google Gemini / OpenAI compatible)

![TechStore Banner](https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=400&fit=crop)

---

## 🏗️ Kiến trúc hệ thống

```
webthuongmai/                         ← Monorepo Root (npm workspaces)
├── apps/
│   ├── api/                          ← Backend: Express + TypeScript + Prisma
│   │   └── src/
│   │       ├── config/               ← Zod-validated env config
│   │       ├── core/                 ← Database, Redis, Logger, Middlewares
│   │       └── modules/              ← auth, product, cart, order, chat, admin...
│   └── web/                          ← Frontend: React 19 + Vite + TailwindCSS
│       └── src/
│           ├── components/           ← UI library, Common, Product, Cart, Chat
│           ├── pages/                ← Customer + Admin pages
│           ├── stores/               ← Zustand global state
│           ├── routes/               ← AppRoutes + Guards
│           └── layouts/              ← MainLayout, AdminLayout, AuthLayout
├── packages/
│   └── shared/                       ← Shared TypeScript types, schemas, enums
├── prisma/
│   ├── schema.prisma                 ← 21 database models
│   └── seed.ts                       ← Rich seed data (30+ products)
└── docker/                           ← Docker configurations
```

---

## ✨ Tính năng chính

### 🛒 Customer Features
- **Trang chủ** — Hero section, Flash Sale countdown, Category grid, Featured products
- **Danh mục sản phẩm** — Filter sidebar (category, brand, price, rating, in-stock), multi-sort, pagination
- **Chi tiết sản phẩm** — Gallery ảnh multi-image, Variant picker, Wishlist, Đánh giá sao
- **Giỏ hàng** — Free-shipping progress bar, Coupon code validation, Live price sync
- **Thanh toán** — ACID transaction order với atomic stock decrement, địa chỉ, payment method
- **Xác nhận đơn** — Confetti animation, order details summary
- **Theo dõi đơn** — Order tracking stepper với visual progress bar
- **Wishlist** — Lưu sản phẩm yêu thích
- **Tài khoản** — Profile settings, password change

### 🤖 AI Chatbot (TechBot)
- **Floating chat widget** — Pulsing button, quick prompt chips, streaming-style typing indicator
- **Tool Calling** — Whitelisted tools: `searchProducts`, `getProductDetails`, `checkProductStock`, `getOrderStatus`, `getStorePolicies`
- **Product cards trong chat** — Interactive suggestion cards với Add to Cart / View buttons
- **Google Gemini / OpenAI compatible** — Cấu hình qua `AI_API_KEY` trong `.env`
- **Local AI fallback** — Hoạt động hoàn toàn offline không cần API key

### 🔐 Authentication & Security
- JWT Access Token (15 phút) + Refresh Token rotation (7 ngày)
- HttpOnly cookies với CSRF protection
- PBKDF2/bcrypt password hashing
- RBAC: `CUSTOMER` | `STAFF` | `ADMIN` | `SUPER_ADMIN`
- Rate limiting: General 100req/15min, Auth 10req/15min, AI 20req/15min
- PII masking trong logs, Request ID tracking

### 🏢 Admin Dashboard
- **KPI Cards** — Tổng doanh thu, đơn hàng, khách hàng, cảnh báo kho
- **Recharts Analytics** — Area chart doanh thu 7 ngày, Pie chart trạng thái đơn
- **Top sản phẩm** bán chạy nhất với doanh số thực tế
- **Quản lý Sản phẩm** — CRUD với modal, ảnh, variants, stock
- **Quản lý Đơn hàng** — Cập nhật trạng thái inline
- **Quản lý Danh mục** — Thêm/sửa/xóa categories
- **Mã Coupon** — Tạo voucher PERCENTAGE / FIXED / FREE_SHIPPING
- **Audit Logs** — Ghi nhận mọi thao tác quản trị

---

## 🚀 Hướng dẫn chạy Development

### Yêu cầu
- Node.js >= 22.x
- npm >= 11.x

### Bước 1: Clone & Install

```bash
git clone https://github.com/your-org/webthuongmai.git
cd webthuongmai
npm install
```

### Bước 2: Cấu hình Environment

```bash
cp .env.example .env
```

Chỉnh sửa `.env`:
```env
# Bắt buộc
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-min-32-chars

# Tùy chọn - AI Chatbot (để trống để dùng local fallback)
AI_API_KEY=AIza...  # Google Gemini API Key
# hoặc
AI_API_KEY=sk-...   # OpenAI API Key
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.openai.com/v1
```

### Bước 3: Khởi tạo Database

```bash
# Sync schema và generate Prisma client
npx prisma db push

# Seed dữ liệu demo (30+ sản phẩm, users, coupons)
npm run prisma:seed
```

### Bước 4: Chạy Development Servers

```bash
# Terminal 1: Backend API (port 5000)
npm run dev:api

# Terminal 2: Frontend (port 5173)
npm run dev:web
```

Mở trình duyệt: **http://localhost:5173**

---

## 👤 Tài khoản Demo

| Vai trò | Email | Mật khẩu |
|---------|-------|---------|
| **Super Admin** | `superadmin@techstore.vn` | `Admin@123456` |
| **Admin** | `admin@techstore.vn` | `Admin@123456` |
| **Khách hàng** | `an.nguyen@gmail.com` | `User@123456` |
| **Khách hàng** | `binh.tran@gmail.com` | `User@123456` |

> 💡 Trên trang Login có nút **"Admin Demo"** và **"Khách Hàng"** để tự điền thông tin nhanh.

---

## 🔌 API Documentation

Swagger UI có sẵn tại: **http://localhost:5000/api/docs**

| Module | Endpoint prefix | Mô tả |
|--------|----------------|-------|
| Auth | `/api/auth` | Register, Login, Logout, Refresh, Forgot/Reset Password |
| Products | `/api/products` | Danh sách, chi tiết, featured, filter |
| Cart | `/api/cart` | Add, update, remove items |
| Coupons | `/api/coupons` | Validate coupon |
| Orders | `/api/orders` | Create, list, detail, cancel |
| Reviews | `/api/reviews` | Create, list by product |
| Wishlist | `/api/wishlist` | Toggle, list |
| Chat | `/api/chat` | Send message, get history |
| Admin | `/api/admin` | Stats, products, orders, categories, coupons, audit logs |

---

## 🐳 Docker Production

```bash
# Tạo .env với secrets production
cp .env.example .env

# Build & run toàn bộ stack (Redis + API + Web)
docker-compose up -d --build

# Xem logs
docker-compose logs -f api

# Dừng
docker-compose down
```

Services:
- **Web (Nginx)**: http://localhost:80
- **API**: http://localhost:5000
- **Redis**: localhost:6379

---

## 🗄️ Database Schema

21 Prisma models:

```
User → RefreshToken, Address, AuditLog
Category → Product (hierarchical)
Brand → Product
Product → ProductImage, ProductVariant, Inventory, Review, CartItem, OrderItem, Wishlist
Cart → CartItem
Order → OrderItem, Payment, CouponUsage
Coupon → CouponUsage
ChatConversation → ChatMessage
```

---

## 🛡️ Bảo mật

| Tính năng | Triển khai |
|-----------|-----------|
| Password hashing | bcryptjs (12 rounds) |
| JWT tokens | RS256 + HttpOnly cookie |
| Refresh token rotation | Revoke on use |
| Rate limiting | express-rate-limit theo endpoint |
| Input validation | Zod schemas |
| SQL injection | Prisma ORM parameterized queries |
| XSS Protection | Helmet + Content Security Policy |
| CORS | Whitelist origins |
| PII masking | Winston custom formatter |
| Audit logging | Mọi thao tác admin được ghi log |

---

## 📁 Mã giảm giá Demo

| Code | Ưu đãi | Điều kiện |
|------|--------|-----------|
| `WELCOME10` | Giảm 10% | Đơn từ 500.000đ |
| `TECHSUMMER` | Giảm 15% | Đơn từ 2.000.000đ |
| `FREESHIP` | Miễn phí vận chuyển | Đơn bất kỳ |

---

## 🧑‍💻 Tech Stack chi tiết

### Frontend
- **React 19** + TypeScript + Vite 6
- **Tailwind CSS 3** (custom dark mode, glassmorphism, glow effects)
- **Zustand** (global state: auth, cart, wishlist, chat, theme)
- **TanStack Query** (server state caching)
- **React Hook Form** + **Zod** (form validation)
- **Recharts** (admin analytics charts)
- **Lucide React** (icon library)
- **canvas-confetti** (order success animation)
- **react-router-dom v7** (SPA routing, lazy loading)

### Backend
- **Node.js 22** + Express + TypeScript
- **Prisma ORM** + SQLite (dễ chuyển sang PostgreSQL)
- **Redis** (caching với in-memory fallback)
- **Winston** (structured logging với PII masking)
- **Zod** (env config validation, request validation)
- **jsonwebtoken** (JWT auth)
- **bcryptjs** (password hashing)
- **swagger-ui-express** (API docs)
- **Google Generative AI** (Gemini Tool Calling)

### DevOps
- **Docker** multi-stage builds
- **Nginx** static serving với SPA routing
- **GitHub Actions** CI/CD pipeline
- **npm workspaces** monorepo

---

## 📝 License

MIT © 2026 TechStore E-Commerce Platform
