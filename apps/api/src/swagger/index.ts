export const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'TechStore E-Commerce REST API',
    version: '1.0.0',
    description: 'API Documentation for TechStore SPA Full-Stack with RBAC, Order Transactions, and AI Chatbot Assistant',
    contact: {
      name: 'TechStore Engineering Team',
      email: 'support@techstore.vn',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        summary: 'Đăng nhập người dùng',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@techstore.vn' },
                  password: { type: 'string', example: 'Admin@123456' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Đăng nhập thành công và trả về accessToken' },
          401: { description: 'Sai tài khoản hoặc mật khẩu' },
        },
      },
    },
    '/api/v1/products': {
      get: {
        summary: 'Lấy danh sách sản phẩm (Tìm kiếm, phân trang, lọc)',
        tags: ['Products'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categorySlug', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price_asc', 'price_desc', 'newest', 'top_rated'] } },
        ],
        responses: {
          200: { description: 'Danh sách sản phẩm kèm metadata phân trang' },
        },
      },
    },
    '/api/v1/orders': {
      post: {
        summary: 'Tạo đơn hàng mới (ACID Transaction & Trừ kho)',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Đặt hàng thành công' },
          400: { description: 'Hết hàng hoặc dữ liệu không hợp lệ' },
        },
      },
    },
    '/api/v1/chat/messages': {
      post: {
        summary: 'Gửi tin nhắn cho Trợ lý AI (Tool Calling & Khuyến nghị sản phẩm)',
        tags: ['AI Chatbot'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Tư vấn cho tôi laptop dưới 25 triệu' },
                },
                required: ['message'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Phản hồi từ AI và danh sách sản phẩm đề xuất' },
        },
      },
    },
  },
};
