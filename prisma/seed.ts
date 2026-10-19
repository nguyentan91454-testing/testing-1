import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding KonyappiShop — Đồ Gia Dụng & Trang Trí...\n');

  // ======================== CLEANUP ========================
  await prisma.userProductView.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleaned old data\n');

  // ======================== USERS ========================
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  const userPasswordHash = await bcrypt.hash('User@123456', 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@konyappi.vn',
      passwordHash,
      fullName: 'Super Admin Konyappi',
      phone: '0901234567',
      role: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@konyappi.vn',
      passwordHash,
      fullName: 'Admin Konyappi',
      phone: '0912345678',
      role: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const customers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'linh.pham@gmail.com',
        passwordHash: userPasswordHash,
        fullName: 'Phạm Thị Linh',
        phone: '0923456789',
        role: 'CUSTOMER',
        isActive: true,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'minh.tran@gmail.com',
        passwordHash: userPasswordHash,
        fullName: 'Trần Văn Minh',
        phone: '0934567890',
        role: 'CUSTOMER',
        isActive: true,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'huong.nguyen@gmail.com',
        passwordHash: userPasswordHash,
        fullName: 'Nguyễn Thị Hương',
        phone: '0945678901',
        role: 'CUSTOMER',
        isActive: true,
        isEmailVerified: true,
      },
    }),
  ]);

  console.log(`✅ Created ${2 + customers.length} users`);

  // ======================== CATEGORIES ========================
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Phòng Khách',
        slug: 'phong-khach',
        description: 'Nội thất & trang trí phòng khách: sofa, bàn cafe, kệ tivi, thảm',
        imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Phòng Ngủ',
        slug: 'phong-ngu',
        description: 'Nội thất phòng ngủ: giường, đệm, tủ quần áo, đèn ngủ',
        imageUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Bếp & Nhà Ăn',
        slug: 'bep-nha-an',
        description: 'Dụng cụ nhà bếp: nồi chảo, dao thớt, chén bát, máy xay, phụ kiện bếp',
        imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Phòng Tắm',
        slug: 'phong-tam',
        description: 'Phụ kiện phòng tắm: khăn tắm cao cấp, gương, giá đỡ, phụ kiện',
        imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Trang Trí & Decor',
        slug: 'trang-tri-decor',
        description: 'Đồ trang trí: tranh tường, nến thơm, chậu cây, đèn trang trí, vật phẩm decor',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Đèn & Chiếu Sáng',
        slug: 'den-chieu-sang',
        description: 'Đèn trang trí & chiếu sáng: đèn chùm, đèn đứng, đèn bàn, đèn LED',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Lưu Trữ & Tổ Chức',
        slug: 'luu-tru-to-chuc',
        description: 'Giải pháp lưu trữ: kệ sách, hộp lưu trữ, móc treo, giỏ mây',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ngoài Trời & Sân Vườn',
        slug: 'ngoai-troi',
        description: 'Nội thất & trang trí sân vườn: ghế sân vườn, đèn sân vườn, chậu hoa ngoài trời',
        imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop',
      },
    }),
  ]);

  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c]));
  console.log(`✅ Created ${categories.length} categories`);

  // ======================== BRANDS ========================
  const brands = await Promise.all([
    prisma.brand.create({
      data: {
        name: 'IKEA',
        slug: 'ikea',
        description: 'Thương hiệu nội thất Thụy Điển nổi tiếng thế giới, thiết kế hiện đại & giá hợp lý',
        logoUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'HAY',
        slug: 'hay',
        description: 'Thương hiệu thiết kế Đan Mạch, phong cách Scandinavian tối giản sang trọng',
        logoUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'Tefal',
        slug: 'tefal',
        description: 'Thương hiệu Pháp chuyên đồ dùng nhà bếp cao cấp, nổi tiếng với công nghệ chống dính Thermospot',
        logoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'Joseph Joseph',
        slug: 'joseph-joseph',
        description: 'Thương hiệu Anh Quốc, dụng cụ nhà bếp sáng tạo thiết kế đẹp & thực dụng',
        logoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'Yankee Candle',
        slug: 'yankee-candle',
        description: 'Thương hiệu nến thơm cao cấp từ Mỹ, hương thơm phong phú & lâu giữ mùi',
        logoUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'Umbra',
        slug: 'umbra',
        description: 'Thương hiệu Canada chuyên phụ kiện trang trí & lưu trữ thiết kế độc đáo',
        logoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'Zone Denmark',
        slug: 'zone-denmark',
        description: 'Thương hiệu Đan Mạch, phụ kiện phòng tắm cao cấp thiết kế Bắc Âu tối giản',
        logoUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=80&h=80&fit=crop',
      },
    }),
    prisma.brand.create({
      data: {
        name: 'Muuto',
        slug: 'muuto',
        description: 'Thương hiệu Đan Mạch cao cấp, đồ dùng & nội thất phong cách Scandinavian đương đại',
        logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
      },
    }),
  ]);

  const brandMap = Object.fromEntries(brands.map((b) => [b.slug, b]));
  console.log(`✅ Created ${brands.length} brands`);

  // ======================== PRODUCTS ========================
  const productData = [
    // ----- PHÒNG KHÁCH -----
    {
      name: 'Ghế Sofa 3 Chỗ KIVIK Phong Cách Bắc Âu',
      slug: 'sofa-3-cho-kivik-bac-au',
      description: 'Ghế sofa 3 chỗ ngồi phong cách Bắc Âu với khung gỗ tự nhiên vững chắc và đệm êm ái. Vải bọc polyester cao cấp, dễ vệ sinh. Thiết kế tối giản phù hợp mọi không gian phòng khách hiện đại.',
      shortDescription: 'Sofa 3 chỗ khung gỗ tự nhiên, vải polyester cao cấp, phong cách Bắc Âu',
      price: 8900000, salePrice: 7490000, stock: 15, isFeatured: true, rating: 4.7, reviewCount: 89,
      categorySlug: 'phong-khach', brandSlug: 'ikea',
      style: '["Bắc Âu","Tối giản"]', roomType: '["Phòng khách"]',
      material: '["Gỗ tự nhiên","Vải"]', color: 'Xám nhạt',
      dimensions: '{"width":"220cm","height":"82cm","depth":"95cm","weight":"45kg"}',
      specifications: JSON.stringify({ 'Số chỗ ngồi': '3', 'Chất liệu khung': 'Gỗ thông', 'Chất liệu đệm': 'Foam mật độ cao', 'Vải bọc': 'Polyester 100%', 'Màu sắc': 'Xám nhạt', 'Bảo hành': '2 năm' }),
      images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1493663284031-b7e3aaa4f32f?w=800&h=600&fit=crop'],
    },
    {
      name: 'Bàn Cafe Gỗ Sồi LISABO Chân Kim Loại',
      slug: 'ban-cafe-go-soi-lisabo',
      description: 'Bàn cafe phòng khách mặt gỗ sồi tự nhiên thớ đẹp, chân kim loại sơn tĩnh điện đen. Kích thước vừa phải 80x80cm, phù hợp phòng khách vừa và nhỏ. Thiết kế Japandi kết hợp Bắc Âu – Nhật Bản.',
      shortDescription: 'Bàn cafe mặt gỗ sồi tự nhiên, chân kim loại đen, phong cách Japandi',
      price: 3200000, salePrice: 2750000, stock: 30, isFeatured: true, rating: 4.8, reviewCount: 124,
      categorySlug: 'phong-khach', brandSlug: 'hay',
      style: '["Japandi","Tối giản"]', roomType: '["Phòng khách"]',
      material: '["Gỗ tự nhiên","Kim loại"]', color: 'Nâu gỗ sồi',
      dimensions: '{"width":"80cm","height":"45cm","depth":"80cm","weight":"12kg"}',
      specifications: JSON.stringify({ 'Kích thước mặt bàn': '80x80 cm', 'Chiều cao': '45 cm', 'Chất liệu': 'Gỗ sồi + Thép sơn tĩnh điện', 'Màu sắc': 'Nâu sồi tự nhiên', 'Bảo hành': '1 năm' }),
      images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop'],
    },
    {
      name: 'Thảm Bông Dệt Tay INGRID 160x230cm',
      slug: 'tham-bong-det-tay-ingrid-160x230',
      description: 'Thảm phòng khách dệt tay 100% bông tự nhiên hữu cơ. Họa tiết geometric Bắc Âu, màu sắc trung tính dễ phối. Chống trơn trượt, dễ giặt máy. Kích thước 160x230cm phù hợp phòng khách tiêu chuẩn.',
      shortDescription: 'Thảm dệt tay 100% bông hữu cơ, họa tiết Bắc Âu, kích thước 160x230cm',
      price: 2100000, salePrice: null, stock: 45, isFeatured: false, rating: 4.5, reviewCount: 67,
      categorySlug: 'phong-khach', brandSlug: 'hay',
      style: '["Bắc Âu","Boho"]', roomType: '["Phòng khách","Phòng ngủ"]',
      material: '["Vải"]', color: 'Kem & Xám',
      dimensions: '{"width":"160cm","height":"1cm","depth":"230cm","weight":"4kg"}',
      specifications: JSON.stringify({ 'Kích thước': '160x230 cm', 'Chất liệu': '100% Bông hữu cơ', 'Kỹ thuật': 'Dệt tay', 'Chống trơn trượt': 'Có', 'Giặt máy': 'Được (30°C)', 'Xuất xứ': 'Ấn Độ' }),
      images: ['https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=800&h=600&fit=crop'],
    },
    // ----- PHÒNG NGỦ -----
    {
      name: 'Đèn Ngủ Gốm Thủ Công COZY LIGHT',
      slug: 'den-ngu-gom-thu-cong-cozy-light',
      description: 'Đèn ngủ đế gốm thủ công men đá xanh rêu, chụp đèn vải lanh tự nhiên. Ánh sáng vàng ấm 2700K tạo không gian phòng ngủ thư giãn. Cáp vải bện thủ công, bóng LED tiết kiệm điện kèm theo.',
      shortDescription: 'Đèn ngủ đế gốm thủ công, chụp vải lanh, ánh sáng vàng ấm 2700K',
      price: 890000, salePrice: 749000, stock: 60, isFeatured: true, rating: 4.9, reviewCount: 203,
      categorySlug: 'phong-ngu', brandSlug: 'muuto',
      style: '["Boho","Rustic","Japandi"]', roomType: '["Phòng ngủ","Phòng khách"]',
      material: '["Gốm sứ","Vải"]', color: 'Xanh rêu & Kem',
      dimensions: '{"width":"20cm","height":"40cm","depth":"20cm","weight":"1.2kg"}',
      specifications: JSON.stringify({ 'Đế đèn': 'Gốm thủ công', 'Chụp đèn': 'Vải lanh tự nhiên', 'Nhiệt độ màu': '2700K (Vàng ấm)', 'Đui bóng': 'E27', 'Bóng LED': 'Kèm theo 7W', 'Cáp': 'Cáp vải bện dài 1.8m' }),
      images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop'],
    },
    {
      name: 'Gối Tựa Lưng Velvet KREME Bộ 2 Cái',
      slug: 'goi-tua-lung-velvet-kreme-bo-2',
      description: 'Bộ 2 gối tựa lưng vỏ nhung velvet mềm mịn, nhân bông tuyết PP cao cấp. Họa tiết phẳng tối giản với viền giống đường khâu. Có khóa kéo ẩn dễ giặt. Phù hợp sofa, giường, ghế đọc sách.',
      shortDescription: 'Bộ 2 gối nhung velvet cao cấp, nhân bông tuyết, kích thước 45x45cm',
      price: 580000, salePrice: 490000, stock: 80, isFeatured: false, rating: 4.6, reviewCount: 156,
      categorySlug: 'phong-ngu', brandSlug: 'hay',
      style: '["Tối giản","Bắc Âu"]', roomType: '["Phòng ngủ","Phòng khách"]',
      material: '["Vải"]', color: 'Xanh cobalt',
      dimensions: '{"width":"45cm","height":"45cm","depth":"15cm","weight":"0.5kg"}',
      specifications: JSON.stringify({ 'Vỏ gối': 'Velvet (Nhung) 100% polyester', 'Nhân gối': 'Bông tuyết PP cao cấp', 'Kích thước': '45x45 cm', 'Số lượng': '2 cái/bộ', 'Khóa kéo': 'Có (ẩn)', 'Giặt máy': 'Được (30°C)' }),
      images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop'],
    },
    // ----- BẾP & NHÀ ĂN -----
    {
      name: 'Chảo Chống Dính Tefal Ingenio Unlimited 28cm',
      slug: 'chao-chong-dinh-tefal-ingenio-28cm',
      description: 'Chảo chống dính Tefal công nghệ Titanium Pro, 5 lớp phủ chống dính siêu bền. Dấu Thermospot đỏ báo nhiệt độ đã đạt chuẩn trước khi cho thức ăn vào. Phù hợp mọi loại bếp kể cả bếp từ. Thân chảo đúc nhôm dày 4mm.',
      shortDescription: 'Chảo chống dính Tefal Titanium Pro 5 lớp, Thermospot, dùng được bếp từ, 28cm',
      price: 1250000, salePrice: 990000, stock: 95, isFeatured: true, rating: 4.8, reviewCount: 412,
      categorySlug: 'bep-nha-an', brandSlug: 'tefal',
      style: '["Tối giản"]', roomType: '["Bếp"]',
      material: '["Kim loại"]', color: 'Đen',
      dimensions: '{"width":"28cm","height":"5.5cm","depth":"46cm","weight":"1.1kg"}',
      specifications: JSON.stringify({ 'Đường kính': '28 cm', 'Số lớp phủ': '5 lớp Titanium Pro', 'Thermospot': 'Có', 'Tương thích bếp': 'Gas, Điện, Từ, Lò nướng', 'Chịu nhiệt lò nướng': '175°C (không nắp)', 'Rửa bát': 'Được', 'Xuất xứ': 'Pháp' }),
      images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop'],
    },
    {
      name: 'Bộ Dao Bếp Joseph Joseph Slice&Sharpen 5 Món',
      slug: 'bo-dao-bep-joseph-joseph-5-mon',
      description: 'Bộ 5 dao bếp thép không gỉ cao cấp X50CrMoV15 kèm khối cắm dao tích hợp máy mài. Cán ergonomic chống trơn trượt. Gồm: dao đầu bếp 20cm, dao thái 15cm, dao gọt 9cm, dao bánh mì, kéo bếp. Mài lại lưỡi sau mỗi lần rút dao.',
      shortDescription: 'Bộ 5 dao bếp thép không gỉ cao cấp, khối cắm tích hợp máy mài lưỡi tự động',
      price: 2490000, salePrice: 1990000, stock: 40, isFeatured: true, rating: 4.7, reviewCount: 98,
      categorySlug: 'bep-nha-an', brandSlug: 'joseph-joseph',
      style: '["Tối giản"]', roomType: '["Bếp"]',
      material: '["Kim loại"]', color: 'Bạc & Trắng',
      dimensions: '{"width":"11cm","height":"22cm","depth":"11cm","weight":"1.8kg"}',
      specifications: JSON.stringify({ 'Số lượng': '5 món (4 dao + 1 kéo)', 'Chất liệu lưỡi': 'Thép X50CrMoV15', 'Độ cứng': '57 HRC', 'Máy mài': 'Tích hợp trong khối cắm', 'Rửa bát': 'Không khuyến nghị', 'Xuất xứ': 'Anh Quốc' }),
      images: ['https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&h=600&fit=crop'],
    },
    {
      name: 'Bình Thủy Tinh Giữ Nhiệt HAY Glass Carafe 1L',
      slug: 'binh-thuy-tinh-giu-nhiet-hay-1l',
      description: 'Bình carafe 1 lít bằng thủy tinh borosilicate chịu nhiệt cao, nắp nút gỗ sồi tự nhiên. Thiết kế Scandinavian tối giản, dùng trên bàn ăn hoặc văn phòng. Giữ nhiệt tốt, không gây mùi, dễ vệ sinh.',
      shortDescription: 'Bình carafe 1L thủy tinh borosilicate, nắp gỗ sồi, thiết kế Bắc Âu',
      price: 890000, salePrice: null, stock: 55, isFeatured: false, rating: 4.9, reviewCount: 76,
      categorySlug: 'bep-nha-an', brandSlug: 'hay',
      style: '["Bắc Âu","Tối giản","Japandi"]', roomType: '["Bếp","Phòng khách"]',
      material: '["Kính","Gỗ tự nhiên"]', color: 'Trong suốt & Nâu gỗ',
      dimensions: '{"width":"12cm","height":"28cm","depth":"12cm","weight":"0.6kg"}',
      specifications: JSON.stringify({ 'Dung tích': '1 lít', 'Chất liệu bình': 'Thủy tinh Borosilicate', 'Nắp': 'Gỗ sồi tự nhiên + Silicon', 'Chịu nhiệt': 'Lên đến 120°C', 'Rửa bát': 'Không', 'Xuất xứ': 'Đan Mạch' }),
      images: ['https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=600&fit=crop'],
    },
    // ----- PHÒNG TẮM -----
    {
      name: 'Bộ 4 Khăn Tắm Zone Denmark Organic Spa',
      slug: 'bo-4-khan-tam-zone-denmark-organic',
      description: 'Bộ 4 khăn tắm cotton hữu cơ GOTS certified, độ thấm hút vượt trội 600gsm. Gồm: 2 khăn tắm lớn 70x140cm và 2 khăn mặt 50x100cm. Sợi bông Ai Cập siêu mềm mịn, giữ màu sau nhiều lần giặt. Phong cách Spa tối giản.',
      shortDescription: 'Bộ 4 khăn cotton hữu cơ GOTS 600gsm, siêu mềm mịn phong cách spa Bắc Âu',
      price: 1490000, salePrice: 1190000, stock: 70, isFeatured: true, rating: 4.8, reviewCount: 187,
      categorySlug: 'phong-tam', brandSlug: 'zone-denmark',
      style: '["Tối giản","Bắc Âu"]', roomType: '["Phòng tắm"]',
      material: '["Vải"]', color: 'Trắng tinh',
      dimensions: '{"khăn tắm":"70x140cm","khăn mặt":"50x100cm","weight":"1.2kg"}',
      specifications: JSON.stringify({ 'Số lượng': '4 cái (2 khăn tắm + 2 khăn mặt)', 'Chất liệu': 'Cotton hữu cơ GOTS', 'Khối lượng': '600 gsm', 'Kích thước khăn tắm': '70x140 cm', 'Kích thước khăn mặt': '50x100 cm', 'Giặt': 'Máy giặt 60°C', 'Xuất xứ': 'Đan Mạch' }),
      images: ['https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=800&h=600&fit=crop'],
    },
    {
      name: 'Giá Đỡ Phòng Tắm Umbra Flex Shower Caddy',
      slug: 'gia-do-phong-tam-umbra-flex',
      description: 'Giá đỡ đồ phòng tắm Umbra bằng thép không gỉ mạ crôm, treo lên vòi sen không cần khoan. Có 3 ngăn chứa: dầu gội, sữa tắm, xà phòng. Móc treo thêm khăn và dao cạo. Điều chỉnh chiều cao linh hoạt.',
      shortDescription: 'Giá đỡ phòng tắm thép không gỉ, treo vòi sen không cần khoan, 3 ngăn chứa',
      price: 650000, salePrice: 540000, stock: 85, isFeatured: false, rating: 4.5, reviewCount: 234,
      categorySlug: 'phong-tam', brandSlug: 'umbra',
      style: '["Tối giản"]', roomType: '["Phòng tắm"]',
      material: '["Kim loại"]', color: 'Crôm bóng',
      dimensions: '{"width":"22cm","height":"65cm","depth":"14cm","weight":"0.8kg"}',
      specifications: JSON.stringify({ 'Chất liệu': 'Thép không gỉ mạ Crôm', 'Số ngăn': '3 ngăn + 2 móc', 'Cách lắp': 'Treo vòi sen (không khoan)', 'Điều chỉnh': 'Chiều cao linh hoạt', 'Tải trọng': '5 kg', 'Xuất xứ': 'Canada' }),
      images: ['https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop'],
    },
    // ----- TRANG TRÍ & DECOR -----
    {
      name: 'Nến Thơm Yankee Candle Clean Cotton Large',
      slug: 'nen-thom-yankee-candle-clean-cotton-large',
      description: 'Nến thơm hũ lớn Yankee Candle hương Clean Cotton – mùi bông vải trắng tinh khôi, tươi mát gợi cảm giác sạch sẽ dễ chịu. Thời gian cháy 110-150 giờ. Hũ thủy tinh dày có nắp kim loại. Nến đậu nành trộn paraffin cao cấp.',
      shortDescription: 'Nến thơm Yankee Candle hương Clean Cotton, cháy 110-150h, hũ thủy tinh lớn',
      price: 890000, salePrice: 750000, stock: 120, isFeatured: true, rating: 4.9, reviewCount: 567,
      categorySlug: 'trang-tri-decor', brandSlug: 'yankee-candle',
      style: '["Tối giản","Bắc Âu"]', roomType: '["Phòng khách","Phòng ngủ","Phòng tắm"]',
      material: '["Gốm sứ"]', color: 'Trắng',
      dimensions: '{"diameter":"10cm","height":"14cm","weight":"0.6kg"}',
      specifications: JSON.stringify({ 'Hương': 'Clean Cotton', 'Thời gian cháy': '110-150 giờ', 'Trọng lượng nến': '538g', 'Hũ': 'Thủy tinh dày + nắp kim loại', 'Thành phần': 'Sáp đậu nành + Paraffin cao cấp', 'Xuất xứ': 'Mỹ' }),
      images: ['https://images.unsplash.com/photo-1602874801006-bc1a2bc7e938?w=800&h=600&fit=crop'],
    },
    {
      name: 'Chậu Cây Gốm Sứ POTTED Kèm Khay Hứng Nước',
      slug: 'chau-cay-gom-su-potted-khay-nuoc',
      description: 'Chậu cây gốm sứ men đá thủ công màu xanh rêu sage green, kèm khay hứng nước. Lỗ thoát nước tốt giữ ẩm vừa phải cho cây. Phù hợp các loại cây nội thất: cây thường xuân, trầu bà, xương rồng. Có 3 kích thước.',
      shortDescription: 'Chậu cây gốm men đá thủ công sage green, kèm khay nước, phù hợp cây nội thất',
      price: 380000, salePrice: null, stock: 150, isFeatured: false, rating: 4.7, reviewCount: 289,
      categorySlug: 'trang-tri-decor', brandSlug: 'umbra',
      style: '["Boho","Rustic","Japandi"]', roomType: '["Phòng khách","Phòng ngủ","Ngoài trời"]',
      material: '["Gốm sứ"]', color: 'Xanh rêu (Sage Green)',
      dimensions: '{"diameter":"15cm","height":"13cm","weight":"0.7kg"}',
      specifications: JSON.stringify({ 'Chất liệu': 'Gốm sứ nung men đá', 'Kích thước': 'Đường kính 15cm, cao 13cm', 'Màu sắc': 'Sage Green (Xanh rêu)', 'Kèm theo': 'Khay hứng nước', 'Lỗ thoát nước': 'Có', 'Phù hợp': 'Cây nội thất & xương rồng' }),
      images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&h=600&fit=crop'],
    },
    {
      name: 'Tranh Canvas Tối Giản Abstract Pastel 60x80cm',
      slug: 'tranh-canvas-toi-gian-abstract-pastel',
      description: 'Tranh canvas nghệ thuật abstract màu pastel nhẹ nhàng, in UV chất lượng cao không phai màu. Khung gỗ thông cứng, vải canvas cotton dày. Sẵn móc treo, dễ lắp đặt. Phù hợp phòng khách, phòng ngủ, phòng làm việc. Bộ 2 tấm ghép đôi.',
      shortDescription: 'Bộ 2 tranh canvas abstract pastel 60x80cm, in UV chất lượng cao, kèm móc treo',
      price: 750000, salePrice: 620000, stock: 65, isFeatured: true, rating: 4.6, reviewCount: 143,
      categorySlug: 'trang-tri-decor', brandSlug: 'muuto',
      style: '["Tối giản","Bắc Âu"]', roomType: '["Phòng khách","Phòng ngủ"]',
      material: '["Vải","Gỗ tự nhiên"]', color: 'Pastel đa sắc',
      dimensions: '{"width":"60cm","height":"80cm","depth":"3cm","weight":"0.8kg"}',
      specifications: JSON.stringify({ 'Kích thước mỗi tấm': '60x80 cm', 'Số lượng': '2 tấm/bộ', 'Chất liệu': 'Canvas cotton + Khung gỗ thông', 'In': 'UV cao cấp không phai màu', 'Kèm theo': 'Móc treo sẵn', 'Phong cách': 'Abstract Pastel Minimalist' }),
      images: ['https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&h=600&fit=crop'],
    },
    // ----- ĐÈN & CHIẾU SÁNG -----
    {
      name: 'Đèn Chùm Mây Rattan Handmade Bohemian',
      slug: 'den-chum-may-rattan-handmade-bohemian',
      description: 'Đèn chùm trang trí đan mây rattan thủ công, phong cách Bohemian tự nhiên. Bóng đèn Edison filament E27 kèm theo. Dây treo điều chỉnh độ cao 40-120cm. Tán đèn đường kính 50cm tạo ánh sáng tán rộng ấm áp. Phù hợp phòng ăn, góc phòng khách.',
      shortDescription: 'Đèn chùm mây rattan thủ công Bohemian, đường kính 50cm, bóng Edison kèm theo',
      price: 1290000, salePrice: 990000, stock: 35, isFeatured: true, rating: 4.8, reviewCount: 178,
      categorySlug: 'den-chieu-sang', brandSlug: 'muuto',
      style: '["Boho","Rustic"]', roomType: '["Phòng khách","Phòng ngủ"]',
      material: '["Gỗ tự nhiên"]', color: 'Nâu mây tự nhiên',
      dimensions: '{"diameter":"50cm","height":"30cm","cord":"40-120cm","weight":"1.5kg"}',
      specifications: JSON.stringify({ 'Đường kính tán': '50 cm', 'Chất liệu': 'Mây Rattan tự nhiên', 'Bóng đèn': 'E27 Edison Filament 4W kèm theo', 'Dây treo': 'Điều chỉnh 40-120cm', 'Công suất max': '40W', 'Lắp đặt': 'Ốc vít kèm theo' }),
      images: ['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&h=600&fit=crop'],
    },
    // ----- LƯU TRỮ & TỔ CHỨC -----
    {
      name: 'Kệ Sách Gỗ Floating BESTÅ Wall Shelf 80cm',
      slug: 'ke-sach-go-floating-besta-80cm',
      description: 'Kệ sách treo tường gỗ MDF phủ veneer sồi, thiết kế floating shelf. Tải trọng 15kg, giá đỡ kim loại chắc chắn. Kích thước 80x20x16cm, phù hợp phòng khách, phòng làm việc, hành lang. Ốc vít và bát treo kèm theo.',
      shortDescription: 'Kệ treo tường gỗ veneer sồi 80cm, floating shelf, tải trọng 15kg',
      price: 690000, salePrice: 590000, stock: 75, isFeatured: false, rating: 4.4, reviewCount: 95,
      categorySlug: 'luu-tru-to-chuc', brandSlug: 'ikea',
      style: '["Tối giản","Bắc Âu"]', roomType: '["Phòng khách","Phòng ngủ"]',
      material: '["Gỗ tự nhiên","Kim loại"]', color: 'Nâu sồi',
      dimensions: '{"width":"80cm","height":"16cm","depth":"20cm","weight":"3.5kg"}',
      specifications: JSON.stringify({ 'Kích thước': '80x20x16 cm', 'Chất liệu': 'MDF phủ Veneer sồi', 'Tải trọng': '15 kg', 'Màu sắc': 'Nâu sồi tự nhiên', 'Lắp đặt': 'Bắt vít tường', 'Kèm theo': 'Ốc vít + Bát treo' }),
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'],
    },
  ];

  let productCount = 0;
  for (const p of productData) {
    const { categorySlug, brandSlug, images, ...rest } = p;
    const product = await prisma.product.create({
      data: {
        ...rest,
        categoryId: catMap[categorySlug].id,
        brandId: brandMap[brandSlug].id,
        images: {
          create: images.map((url, idx) => ({
            url,
            altText: rest.name,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        },
        inventories: {
          create: { quantity: rest.stock, reserved: 0, location: 'Kho Hà Nội' },
        },
      },
    });
    productCount++;

    // Add 2-3 sample reviews per product
    const reviewUsers = [customers[0], customers[1], customers[2]];
    const sampleReviews = [
      { rating: 5, comment: 'Sản phẩm đẹp hơn ảnh, chất lượng rất tốt! Giao hàng nhanh, đóng gói cẩn thận. Mình rất hài lòng, sẽ mua thêm.' },
      { rating: 4, comment: 'Sản phẩm ổn, đúng mô tả. Chỉ mất thêm chút thời gian lắp đặt. Nhìn chung là đáng tiền.' },
      { rating: 5, comment: 'Tuyệt vời! Mình đã tìm kiếm sản phẩm này lâu rồi. Chất liệu cao cấp, thiết kế sang trọng. Hoàn toàn hài lòng!' },
    ];

    for (let i = 0; i < Math.min(2, sampleReviews.length); i++) {
      await prisma.review.create({
        data: {
          productId: product.id,
          userId: reviewUsers[i].id,
          rating: sampleReviews[i].rating,
          comment: sampleReviews[i].comment,
          isVerifiedPurchase: true,
        },
      });
    }
  }
  console.log(`✅ Created ${productCount} products with images, inventory & reviews`);

  // ======================== COUPONS ========================
  const now = new Date();
  const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'WELCOME15',
        description: 'Giảm 15% cho đơn hàng đầu tiên tại KonyappiShop',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderValue: 500000,
        maxDiscountAmount: 300000,
        usageLimit: 500,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'HOMEDECOR200',
        description: 'Giảm thẳng 200.000đ cho đơn trang trí nội thất từ 2 triệu',
        discountType: 'FIXED',
        discountValue: 200000,
        minOrderValue: 2000000,
        maxDiscountAmount: 200000,
        usageLimit: 200,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'FREESHIP',
        description: 'Miễn phí vận chuyển toàn quốc cho mọi đơn hàng',
        discountType: 'FREE_SHIPPING',
        discountValue: 0,
        minOrderValue: 0,
        usageLimit: 1000,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'SUMMER2026',
        description: 'Ưu đãi mùa hè - Giảm 10% không giới hạn đơn tối thiểu',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 0,
        maxDiscountAmount: 500000,
        usageLimit: 300,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Created 4 coupons');

  // ======================== ADDRESSES ========================
  await prisma.address.create({
    data: {
      userId: customers[0].id,
      recipientName: 'Phạm Thị Linh',
      phone: '0923456789',
      street: '45 Ngõ Hoa Bằng',
      ward: 'Phường Yên Hòa',
      district: 'Quận Cầu Giấy',
      city: 'Hà Nội',
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: customers[1].id,
      recipientName: 'Trần Văn Minh',
      phone: '0934567890',
      street: '123 Đường Lê Văn Việt',
      ward: 'Phường Hiệp Phú',
      district: 'Quận 9',
      city: 'TP. Hồ Chí Minh',
      isDefault: true,
    },
  });
  console.log('✅ Created sample addresses');

  console.log('\n🎉 KonyappiShop seed completed!\n');
  console.log('='.repeat(60));
  console.log('📊 TỔNG KẾT:');
  console.log(`   👤 Users:      ${2 + customers.length} (2 admin + ${customers.length} khách hàng)`);
  console.log(`   📦 Categories: ${categories.length}`);
  console.log(`   🏷️  Brands:     ${brands.length}`);
  console.log(`   🛍️  Products:   ${productCount}`);
  console.log(`   🎟️  Coupons:    4`);
  console.log('='.repeat(60));
  console.log('\n🔑 Demo Accounts:');
  console.log('   superadmin@konyappi.vn / Admin@123456');
  console.log('   admin@konyappi.vn     / Admin@123456');
  console.log('   linh.pham@gmail.com   / User@123456');
  console.log('\n🎟️ Demo Coupons:');
  console.log('   WELCOME15    - Giảm 15% (đơn từ 500k)');
  console.log('   HOMEDECOR200 - Giảm 200k (đơn từ 2 triệu)');
  console.log('   FREESHIP     - Miễn phí ship');
  console.log('   SUMMER2026   - Giảm 10% mọi đơn\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
