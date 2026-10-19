Bạn là một **Senior Full-Stack Software Architect + Senior React/Node.js Developer + Database Engineer + Cybersecurity Engineer + DevOps Engineer**. Hãy xây dựng một hệ thống **Web thương mại điện tử SPA (Single Page Application) hoàn chỉnh**, có kiến trúc production-ready, có backend REST API, database quan hệ, authentication/authorization, thanh toán giả lập hoặc có thể tích hợp payment gateway, quản trị sản phẩm/đơn hàng và tích hợp **AI Chatbot thông qua API của một AI provider bên ngoài**.

Mục tiêu không chỉ là làm giao diện đẹp mà phải xây dựng hệ thống theo hướng **scalable, secure, maintainable, performant và production-ready**.

---

# 1. TECH STACK

## Frontend

Sử dụng:

- React.js
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand hoặc Redux Toolkit cho global state khi thực sự cần
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Axios hoặc Fetch API
- Lucide React
- Recharts cho dashboard
- React Helmet/Metadata solution cho SEO
- Debounce/Throttle cho search và filter
- Lazy Loading
- Code Splitting
- Image Lazy Loading
- Virtualization nếu danh sách lớn

Frontend phải sử dụng TypeScript strict mode.

Không viết code React theo kiểu monolithic component.

Phân chia rõ:

```text
components/
pages/
layouts/
features/
hooks/
services/
api/
stores/
types/
schemas/
utils/
constants/
lib/
```

Áp dụng:

- reusable components
- custom hooks
- feature-based architecture khi phù hợp
- separation of concerns
- SOLID principles
- DRY
- clean code

---

# 2. BACKEND

Sử dụng:

- Node.js
- TypeScript
- NestJS hoặc Express.js có cấu trúc production-ready
- PostgreSQL
- Prisma ORM
- Redis
- JWT
- HTTP-only Secure Cookie
- Argon2 hoặc bcrypt cho password hashing
- Zod hoặc class-validator
- Helmet
- CORS
- Rate Limiting
- Pino/Winston logging
- Swagger/OpenAPI
- Docker

Nếu sử dụng NestJS, hãy áp dụng:

```text
modules/
controllers/
services/
repositories/
dto/
entities/
guards/
decorators/
middlewares/
interceptors/
filters/
common/
config/
```

Không đặt business logic trực tiếp trong controller.

Controller chỉ xử lý:

Request
→ Validation
→ Service
→ Response

Business logic phải nằm trong Service.

---

# 3. DATABASE

Sử dụng:

**PostgreSQL + Prisma ORM**

Thiết kế database chuẩn production.

Các entity tối thiểu:

```text
User
Role
Permission
Product
ProductVariant
Category
Brand
ProductImage
Inventory
Cart
CartItem
Order
OrderItem
Payment
Address
Review
Wishlist
Coupon
CouponUsage
RefreshToken
AuditLog
ChatConversation
ChatMessage
```

Thiết kế:

- Primary Key
- Foreign Key
- Unique Constraint
- Composite Index
- Index cho các trường thường xuyên query
- CreatedAt
- UpdatedAt
- Soft Delete nếu phù hợp
- Referential Integrity
- Transaction
- Pagination

Không query database theo kiểu N+1.

Ví dụ:

```text
User 1---N Order
Order 1---N OrderItem
Product 1---N ProductVariant
Product 1---N ProductImage
Product N---1 Category
User 1---N Review
User 1---N Cart
Cart 1---N CartItem
```

Hãy tạo:

```text
prisma/schema.prisma
```

và giải thích quan hệ giữa các bảng.

---

# 4. AUTHENTICATION

Xây dựng authentication hoàn chỉnh:

- Register
- Login
- Logout
- Refresh Token
- Forgot Password
- Reset Password
- Email Verification
- Change Password
- Get Current User

Sử dụng:

```text
Short-lived Access Token
+
Long-lived Refresh Token
```

Refresh Token phải được bảo vệ bằng:

```text
HttpOnly
Secure
SameSite
```

Không lưu JWT authentication token trong localStorage nếu có thể tránh.

Password:

```text
Argon2id
```

Không bao giờ lưu plaintext password.

Response lỗi login không được tiết lộ:

```text
email tồn tại hay không
```

---

# 5. AUTHORIZATION

Xây dựng RBAC:

```text
CUSTOMER
STAFF
ADMIN
SUPER_ADMIN
```

Có thể mở rộng Permission:

```text
product.read
product.create
product.update
product.delete

order.read
order.update

user.read
user.update

coupon.create
coupon.delete
```

Backend phải kiểm tra authorization.

Không được chỉ ẩn nút Admin ở frontend mà phải bảo vệ API ở backend.

---

# 6. PRODUCT SYSTEM

Xây dựng:

- Product CRUD
- Category
- Brand
- Product Variant
- SKU
- Price
- Discount Price
- Stock
- Product Images
- Product Description
- Product Attributes
- Product Status

Product có thể có:

```text
name
slug
description
price
salePrice
categoryId
brandId
status
rating
createdAt
updatedAt
```

Hỗ trợ:

- Search
- Filter
- Sort
- Pagination
- Category filtering
- Price filtering
- Brand filtering
- Rating filtering

Search phải có debounce.

---

# 7. CART

Xây dựng:

```text
Add to Cart
Remove from Cart
Update Quantity
Clear Cart
Get Cart
Calculate Total
Apply Coupon
```

Backend phải kiểm tra lại:

- product tồn tại
- product còn bán
- variant tồn tại
- stock
- giá hiện tại

Không tin giá hoặc tổng tiền được gửi từ frontend.

---

# 8. ORDER

Flow:

```text
Cart
 ↓
Checkout
 ↓
Validate Product
 ↓
Validate Stock
 ↓
Calculate Price Server-side
 ↓
Apply Coupon
 ↓
Create Order Transaction
 ↓
Payment
 ↓
Update Inventory
 ↓
Order Confirmation
```

Order status:

```text
PENDING
CONFIRMED
PROCESSING
SHIPPING
DELIVERED
CANCELLED
REFUNDED
```

Payment:

```text
PENDING
PAID
FAILED
REFUNDED
```

Sử dụng database transaction để tránh:

- overselling
- duplicate order
- inconsistent inventory

---

# 9. PAYMENT

Thiết kế Payment Service abstraction:

```text
PaymentProvider
```

Cho phép sau này tích hợp:

```text
Stripe
PayPal
VNPay
MoMo
```

Không hard-code payment logic vào Order Service.

Có thể implement trước bằng:

```text
MockPaymentProvider
```

để test toàn bộ flow.

---

# 10. SECURITY

Áp dụng OWASP best practices.

Phòng chống:

```text
SQL Injection
XSS
CSRF
CORS attacks
Brute Force
Credential Stuffing
Session Hijacking
JWT abuse
Mass Assignment
IDOR
Broken Access Control
Rate Limit abuse
File Upload attacks
Prompt Injection
```

Backend:

- Helmet
- Rate limiting
- Request validation
- Input sanitization
- CORS whitelist
- Secure headers
- Secure cookies
- Password hashing
- Request size limit
- File type validation
- File size limit
- Audit logging

Không trả:

```text
passwordHash
refreshToken
internal secrets
database errors
stack traces
```

ra frontend.

Production error response phải dạng:

```json
{
  "success": false,
  "message": "Something went wrong",
  "code": "INTERNAL_SERVER_ERROR"
}
```

Development mới được phép trả stack trace.

---

# 11. API DESIGN

Thiết kế REST API:

```text
/api/v1/auth
/api/v1/users
/api/v1/products
/api/v1/categories
/api/v1/brands
/api/v1/cart
/api/v1/orders
/api/v1/payments
/api/v1/coupons
/api/v1/reviews
/api/v1/wishlist
/api/v1/admin
/api/v1/chat
```

Ví dụ:

```text
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id
```

Response format thống nhất:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Pagination:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

# 12. FRONTEND PAGES

Tạo đầy đủ:

```text
/
 /products
 /products/:slug
 /categories/:slug
 /search
 /cart
 /checkout
 /orders
 /orders/:id
 /wishlist
 /profile
 /login
 /register
 /forgot-password
 /reset-password
 /admin
 /admin/products
 /admin/orders
 /admin/users
 /admin/categories
 /admin/coupons
 /admin/analytics
```

---

# 13. UI/UX

Thiết kế hiện đại giống các ecommerce platform lớn.

Có:

- Responsive
- Mobile-first
- Desktop
- Tablet
- Dark mode
- Skeleton loading
- Empty state
- Error state
- Toast notification
- Modal
- Drawer
- Confirmation dialog
- Pagination
- Infinite scroll khi phù hợp

Product card:

```text
Image
Product Name
Rating
Price
Sale Price
Discount
Add to Cart
Wishlist
```

Không tạo UI quá rối.

Ưu tiên UX:

```text
Fast
Clear
Accessible
Responsive
Consistent
```

---

# 14. PERFORMANCE

Tối ưu:

Frontend:

- React.lazy
- Suspense
- Route-level code splitting
- Image lazy loading
- WebP/AVIF
- CDN
- Memoization khi thực sự cần
- TanStack Query caching
- Debounced search
- Bundle optimization
- Tree shaking

Backend:

- Redis caching
- Database indexing
- Connection pooling
- Pagination
- Compression
- HTTP caching
- Avoid N+1 query

Redis sử dụng cho:

```text
Product cache
Session-related data nếu cần
Rate limiting
OTP
Popular products
```

Không cache dữ liệu nhạy cảm một cách tùy tiện.

---

# 15. AI CHATBOT

Tích hợp chatbot sử dụng API của một AI provider bên ngoài.

Thiết kế abstraction:

```text
AIProvider
```

Ví dụ:

```text
OpenAIProvider
GeminiProvider
AnthropicProvider
```

Không expose API key ra frontend.

Frontend:

```text
React Chat UI
        ↓
POST /api/v1/chat/messages
        ↓
Backend Chat Service
        ↓
AI Provider
        ↓
Response
        ↓
Frontend
```

API key chỉ nằm trong:

```text
.env
```

Ví dụ:

```env
AI_API_KEY=
AI_MODEL=
```

Không commit `.env`.

---

# 16. AI CHATBOT ECOMMERCE FEATURES

Chatbot không chỉ là chatbot thông thường.

Nó phải có thể:

```text
Tư vấn sản phẩm
Tìm sản phẩm
So sánh sản phẩm
Giải thích thông số
Gợi ý sản phẩm dựa trên nhu cầu
Hỏi trạng thái đơn hàng
Giải thích chính sách
Hỗ trợ FAQ
```

Ví dụ:

User:

> Tôi cần một laptop để lập trình dưới 25 triệu.

Chatbot:

```text
- Tìm sản phẩm phù hợp
- Lọc database
- Đưa ra 3-5 sản phẩm
- Giải thích lý do lựa chọn
```

Quan trọng:

**AI không được tự bịa thông tin sản phẩm, giá hoặc tồn kho.**

AI phải lấy dữ liệu từ backend/database thông qua các tool/function phù hợp.

Thiết kế:

```text
User
 ↓
Chat API
 ↓
AI
 ↓
Tool Calling
 ↓
Product Search API
 ↓
Database
 ↓
AI
 ↓
Response
```

Tools có thể gồm:

```text
searchProducts()
getProductDetails()
checkProductStock()
getOrderStatus()
searchFAQ()
```

---

# 17. AI SECURITY

Phải chống:

```text
Prompt Injection
System Prompt Leakage
Sensitive Data Leakage
Excessive Tool Permissions
Data Exfiltration
AI Hallucination
```

AI không được phép:

```text
thực hiện SQL trực tiếp
truy cập database trực tiếp
thực hiện thao tác admin
thay đổi giá
xóa sản phẩm
thay đổi order
```

AI chỉ được gọi các tool backend đã whitelist.

Ví dụ:

```text
searchProducts
getProductDetails
getOrderStatus
```

Không cho AI thực hiện:

```text
executeSQL
executeCommand
```

---

# 18. CHAT HISTORY

Database:

```text
ChatConversation
ChatMessage
```

Lưu:

```text
userId
role
message
createdAt
```

Có pagination cho lịch sử chat.

Không lưu API key.

Có cơ chế giới hạn số lượng request AI để tránh chi phí ngoài ý muốn.

---

# 19. ADMIN DASHBOARD

Dashboard có:

```text
Total Revenue
Total Orders
Total Customers
Total Products
Low Stock Products
Top Products
Recent Orders
Revenue Chart
Order Chart
```

Admin có thể:

```text
Manage Products
Manage Categories
Manage Users
Manage Orders
Manage Coupons
Manage Inventory
View Audit Logs
```

Mọi admin API đều phải kiểm tra RBAC.

---

# 20. LOGGING & MONITORING

Implement:

```text
Structured Logging
Request ID
Error Logging
Audit Logging
```

Audit log:

```text
userId
action
resource
resourceId
ip
userAgent
timestamp
```

Không log:

```text
password
JWT
API key
credit card information
```

---

# 21. TESTING

Backend:

```text
Unit Test
Integration Test
E2E Test
```

Frontend:

```text
Component Test
Integration Test
E2E Test
```

Có thể sử dụng:

```text
Vitest
Jest
React Testing Library
Playwright
Supertest
```

Test tối thiểu:

```text
Register
Login
Logout
Product CRUD
Cart
Checkout
Order
Authorization
Rate limiting
AI chatbot
```

---

# 22. DOCKER

Tạo:

```text
Dockerfile
docker-compose.yml
.dockerignore
```

Docker Compose gồm:

```text
frontend
backend
postgres
redis
```

Có thể thêm:

```text
nginx
```

nếu cần reverse proxy.

---

# 23. ENVIRONMENT

Tách:

```text
.env
.env.example
.env.development
.env.production
```

Ví dụ:

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
AI_API_KEY=
AI_MODEL=
CORS_ORIGIN=
```

Không hard-code secret.

---

# 24. CI/CD

Thiết kế GitHub Actions:

```text
Push
 ↓
Lint
 ↓
Type Check
 ↓
Unit Test
 ↓
Build
 ↓
Security Scan
 ↓
Docker Build
 ↓
Deploy
```

Có thể sử dụng:

```text
GitHub Actions
Docker
Cloudflare
VPS
```

---

# 25. PROJECT STRUCTURE

Tạo monorepo:

```text
ecommerce/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── shared/
│   ├── types/
│   ├── eslint-config/
│   └── tsconfig/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

Có thể sử dụng:

```text
pnpm
Turborepo
```

nếu phù hợp.

---

# 26. CODE QUALITY

Bắt buộc:

```text
TypeScript strict
ESLint
Prettier
Husky
lint-staged
Conventional Commits
```

Không sử dụng:

```text
any
```

trừ trường hợp thực sự cần thiết và phải giải thích.

Không copy-paste business logic.

Không tạo component quá lớn.

Không viết API call trực tiếp trong UI component.

---

# 27. SEO

Mặc dù là SPA, hãy tối ưu:

```text
Meta title
Meta description
Open Graph
Canonical URL
Structured Data
Product Schema
Breadcrumb Schema
```

Nếu SEO là yêu cầu rất cao, hãy đánh giá liệu React SPA thuần có phù hợp hay nên chuyển frontend sang:

```text
Next.js
```

Trong trường hợp cần SEO mạnh, có thể sử dụng:

```text
Next.js + React
```

thay cho Vite React SPA, nhưng vẫn phải giữ trải nghiệm SPA.

Hãy giải thích lựa chọn kiến trúc.

---

# 28. ACCESSIBILITY

Tuân thủ WCAG ở mức hợp lý:

```text
Semantic HTML
Keyboard Navigation
ARIA
Focus Management
Color Contrast
Alt Text
Form Labels
Error Messages
```

---

# 29. API DOCUMENTATION

Tạo Swagger/OpenAPI.

Documentation phải mô tả:

```text
Authentication
Products
Cart
Orders
Payments
Users
Admin
Chatbot
```

Mỗi API cần có:

```text
Method
URL
Request
Response
Authentication
Possible Errors
```

---

# 30. DATABASE SEED

Tạo seed data:

```text
1 Super Admin
1 Admin
5 Customers

10 Categories
5 Brands
50 Products
Product Variants
Product Images

Sample Orders
Sample Reviews
Sample Coupons
```

Không dùng dữ liệu thật.

---

# 31. ERROR HANDLING

Frontend phải có:

```text
Global Error Boundary
API Error Handler
401 Handler
403 Handler
404 Handler
500 Handler
Network Error Handler
```

Backend:

```text
Global Exception Handler
Validation Error
Authentication Error
Authorization Error
Database Error
Not Found Error
Rate Limit Error
```

---

# 32. SECURITY HEADERS

Thiết lập phù hợp:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
X-Frame-Options
```

Không cấu hình CSP một cách tùy tiện làm hỏng ứng dụng; hãy giải thích từng policy.

---

# 33. RATE LIMIT

Có các mức rate limit khác nhau:

```text
Login
Register
Password Reset
AI Chat
General API
```

Ví dụ:

```text
General API:
100 requests / minute

Login:
5 attempts / minute / IP

AI:
20 requests / minute / user
```

Các giá trị phải được đưa vào configuration và có thể thay đổi theo môi trường.

---

# 34. FILE UPLOAD

Product image upload phải:

```text
Validate MIME
Validate extension
Validate size
Generate unique filename
Resize image
Strip metadata nếu cần
Store outside application server hoặc object storage
```

Không tin filename từ client.

Không cho phép upload:

```text
.js
.html
.php
.exe
```

---

# 35. DATABASE TRANSACTION

Các operation quan trọng phải dùng transaction:

```text
Create Order
Update Inventory
Payment
Coupon Usage
Refund
```

Ví dụ:

```text
BEGIN TRANSACTION

Validate stock
Create order
Create order items
Decrease inventory
Create payment

COMMIT
```

Nếu có lỗi:

```text
ROLLBACK
```

---

# 36. FINAL DELIVERABLE

Không chỉ đưa ra code rời rạc.

Hãy xây dựng hệ thống theo từng phase:

## Phase 1

Architecture

## Phase 2

Database schema

## Phase 3

Backend API

## Phase 4

Authentication & Authorization

## Phase 5

Frontend

## Phase 6

Cart & Checkout

## Phase 7

Admin Dashboard

## Phase 8

AI Chatbot

## Phase 9

Security

## Phase 10

Testing

## Phase 11

Docker

## Phase 12

CI/CD

## Phase 13

Performance optimization

---

# 37. QUY TẮC KHI GENERATE CODE

Khi bắt đầu code:

1. Phân tích requirements.
2. Đưa ra architecture diagram.
3. Đưa ra folder structure.
4. Thiết kế database.
5. Viết Prisma schema.
6. Tạo backend foundation.
7. Tạo authentication.
8. Tạo product APIs.
9. Tạo cart/order APIs.
10. Tạo frontend.
11. Tích hợp API.
12. Tạo admin dashboard.
13. Tích hợp AI.
14. Thêm security.
15. Viết tests.
16. Dockerize.
17. Viết README.
18. Kiểm tra toàn bộ project.

Mỗi phase phải:

```text
- Giải thích mục tiêu
- Tạo code hoàn chỉnh
- Chỉ rõ file path
- Không bỏ qua import
- Không sử dụng pseudo-code nếu đang yêu cầu implementation
- Không tạo code thiếu dependency
- Không tạo API frontend không tồn tại ở backend
- Không tạo database field nhưng quên Prisma schema
- Không hard-code secrets
```

Sau mỗi phase hãy kiểm tra:

```text
TypeScript errors
Import errors
Dependency errors
API mismatch
Database mismatch
Security issues
```

Nếu phát hiện vấn đề trong code đã tạo ở phase trước, hãy sửa code trước khi tiếp tục.

---

# 38. ARCHITECTURE PRINCIPLE

Ưu tiên kiến trúc:

```text
                    ┌──────────────────┐
                    │      Client      │
                    │ React / Browser  │
                    └────────┬─────────┘
                             │ HTTPS
                             ▼
                    ┌──────────────────┐
                    │ Reverse Proxy /  │
                    │ CDN / Cloudflare │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   REST API       │
                    │ Node / NestJS    │
                    └──────┬─────┬─────┘
                           │     │
                 ┌─────────┘     └──────────┐
                 ▼                          ▼
          ┌─────────────┐             ┌─────────────┐
          │ PostgreSQL  │             │    Redis    │
          └─────────────┘             └─────────────┘
                 │
                 ▼
          ┌─────────────┐
          │   Prisma    │
          └─────────────┘

                     AI Chat
                        │
                        ▼
                ┌───────────────┐
                │ AI Provider   │
                │ External API  │
                └───────────────┘
```

---

# 39. MỤC TIÊU CUỐI CÙNG

Hệ thống phải đạt:

```text
Production-ready
Secure by design
Scalable
Maintainable
Type-safe
Responsive
Fast
SEO-friendly
Accessible
Testable
Observable
Dockerized
AI-enabled
```

Không đơn giản hóa kiến trúc chỉ để giảm số lượng file.

Hãy ưu tiên **chất lượng kiến trúc, bảo mật, khả năng mở rộng và khả năng bảo trì lâu dài**.

Nếu có nhiều lựa chọn công nghệ, hãy so sánh ngắn gọn và chọn phương án phù hợp nhất thay vì sử dụng tất cả công nghệ một cách không cần thiết.

**Bắt đầu bằng Phase 1: phân tích requirements, kiến trúc tổng thể, technology decision và folder structure. Chưa cần viết toàn bộ code trong một lần; triển khai tuần tự từng phase để tránh code không đồng bộ.**