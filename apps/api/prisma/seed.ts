import { PrismaClient, ProductStatus } from "@prisma/client";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const prisma = new PrismaClient();

const products = [
  { slug: "den-tha-may-tre", name: "Đèn thả mây tre An Nhiên", sku: "AN-NH-01", priceVnd: 1_290_000, category: "den-tha", space: "ban-an", style: "indochine", description: "Đèn thả chao mây đan thủ công, ánh sáng ấm cho bàn ăn và không gian nghỉ ngơi.", lumen: 1800, fixtureType: "pendant", maxHangingLengthMm: 1200, fixtureHeightMm: 350 },
  { slug: "den-ban-go-soi", name: "Đèn bàn gỗ sồi Mộc", sku: "MO-DB-01", priceVnd: 890_000, category: "den-ban", space: "phong-ngu", style: "bac-au", description: "Đèn bàn chân gỗ sồi, thiết kế gọn nhẹ phù hợp bàn đầu giường.", lumen: 500, fixtureType: "table", maxHangingLengthMm: null, fixtureHeightMm: null },
  { slug: "den-op-tran-luna", name: "Đèn ốp trần Luna", sku: "LU-OT-01", priceVnd: 1_650_000, category: "den-op-tran", space: "phong-khach", style: "hien-dai", description: "Đèn ốp trần LED tiết kiệm điện, thiết kế tối giản cho căn hộ hiện đại.", lumen: 2400, fixtureType: "ceiling", maxHangingLengthMm: null, fixtureHeightMm: 90 },
];

async function main() {
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@example.test";
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!bootstrapPassword || bootstrapPassword.length < 12) throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD (at least 12 characters) before seeding the admin account");
  await prisma.adminUser.upsert({
    where: { email: bootstrapEmail.toLowerCase() },
    update: {},
    create: { email: bootstrapEmail.toLowerCase(), passwordHash: await argon2.hash(bootstrapPassword), role: "ADMIN" },
  });
  await prisma.setting.upsert({
    where: { key: "checkout_policy" },
    update: {},
    create: {
      key: "checkout_policy",
      value: {
        shippingFeeVnd: 35_000,
        freeShippingThresholdVnd: 1_000_000,
        shippingSubsidyCapVnd: 30_000,
        fullCodLimitVnd: 1_500_000,
        depositLimitVnd: 4_000_000,
        depositRatePercent: 30,
      },
    },
  });
  const lightingRules = [
    ["phong-khach", 300],
    ["phong-ngu", 150],
    ["ban-an", 250],
    ["phong-lam-viec", 400],
    ["phong-tam", 200],
    ["quan-ca-phe", 300],
  ] as const;
  for (const [roomType, lumenPerM2] of lightingRules) {
    await prisma.lightingRule.upsert({
      where: { roomType },
      update: { lumenPerM2 },
      create: { roomType, lumenPerM2, notes: "Hệ số khuyến nghị, có thể điều chỉnh trong Admin." },
    });
  }
  await prisma.setting.upsert({
    where: { key: "chatbot_policy" },
    update: {},
    create: { key: "chatbot_policy", value: {
      dailyBudgetMicroUsd: 350_000,
      monthlyBudgetMicroUsd: 8_000_000,
      inputCostMicroUsdPerMillionTokens: 1_000_000,
      outputCostMicroUsdPerMillionTokens: 5_000_000,
      demoMode: false,
    } },
  });
  const policyChunks = [
    ["demo", "Đây là website đồ án với dữ liệu sản phẩm và giá minh họa. Không thu tiền thật. Thanh toán VietQR trong luồng demo chỉ là giả lập."],
    ["warranty", "Bảo hành: 12 tháng cho phần điện của đèn (driver, nguồn, LED), tính từ ngày giao hàng thành công. Khách cần hỗ trợ qua yêu cầu liên hệ trên website; nhân viên sẽ phản hồi theo thông tin đã cung cấp."],
    ["shipping-cod", "Vận chuyển và COD trong môi trường demo có thể dùng dữ liệu mô phỏng. Phương thức thanh toán và khoản cọc được xác định theo chính sách checkout đang lưu trong cấu hình tại thời điểm đặt đơn."],
    ["privacy", "Chỉ cung cấp thông tin liên hệ khi cần nhân viên gọi lại hoặc xác minh đơn hàng. Không gửi số điện thoại, email, địa chỉ hay thông tin thanh toán vào nội dung chatbot."],
    ["product-advice", "Khi chọn đèn, cân nhắc diện tích phòng, loại phòng, chiều cao trần, lumen, kiểu lắp đặt, nhiệt độ màu và ngân sách. Nếu thiếu diện tích hoặc chiều cao trần, hỏi khách trước khi tính lumen hoặc khẳng định một mẫu đèn phù hợp."],
  ] as const;
  for (const [sourceId, text] of policyChunks) {
    const contentHash = createHash("sha256").update(text).digest("hex");
    await prisma.contentChunk.deleteMany({ where: { source: "policy", sourceId } });
    await prisma.contentChunk.create({ data: { source: "policy", sourceId, text, contentHash } });
  }
  const technicalAttributes = [
    { key: "lumen", label: "Quang thông", type: "NUMBER", unit: "lm" },
    { key: "fixture_type", label: "Kiểu lắp đặt", type: "STRING", unit: null },
    { key: "max_hanging_length_mm", label: "Chiều dài dây thả tối đa", type: "NUMBER", unit: "mm" },
    { key: "fixture_height_mm", label: "Chiều cao thân đèn", type: "NUMBER", unit: "mm" },
  ] as const;
  for (const attribute of technicalAttributes) {
    await prisma.attributeDefinition.upsert({ where: { key: attribute.key }, update: { label: attribute.label, type: attribute.type, unit: attribute.unit }, create: attribute });
  }
  const categoryNames: Record<string, string> = { "den-tha": "Đèn thả", "den-ban": "Đèn bàn", "den-op-tran": "Đèn ốp trần" };
  for (const [slug, name] of Object.entries(categoryNames)) {
    await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name, isActive: true } });
  }
  const spaces = [ ["ban-an", "Bàn ăn"], ["phong-ngu", "Phòng ngủ"], ["phong-khach", "Phòng khách"] ] as const;
  for (const [slug, name] of spaces) await prisma.space.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  const styles = [ ["indochine", "Indochine"], ["bac-au", "Bắc Âu"], ["hien-dai", "Hiện đại"] ] as const;
  for (const [slug, name] of styles) await prisma.style.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  const brand = await prisma.brand.upsert({ where: { slug: "nha-minh" }, update: { name: "Nhà Mình" }, create: { slug: "nha-minh", name: "Nhà Mình" } });

  for (const item of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: item.description, minPriceVnd: item.priceVnd, status: ProductStatus.ACTIVE, isActive: true },
      create: { slug: item.slug, name: item.name, description: item.description, brandId: brand.id, minPriceVnd: item.priceVnd, status: ProductStatus.ACTIVE, isActive: true },
    });
    const attributeRows = [
      ["lumen", item.lumen],
      ["fixture_type", item.fixtureType],
      ...(item.maxHangingLengthMm === null ? [] : [["max_hanging_length_mm", item.maxHangingLengthMm] as const]),
      ...(item.fixtureHeightMm === null ? [] : [["fixture_height_mm", item.fixtureHeightMm] as const]),
    ] as const;
    for (const [key, value] of attributeRows) {
      const definition = await prisma.attributeDefinition.findUniqueOrThrow({ where: { key } });
      await prisma.productAttribute.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: definition.id } },
        update: { value },
        create: { productId: product.id, attributeId: definition.id, value },
      });
    }
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
      update: {},
      create: { productId: product.id, categoryId: category.id },
    });
    await prisma.variant.upsert({
      where: { sku: item.sku },
      update: { productId: product.id, priceVnd: item.priceVnd, stockQty: 10, isAvailable: true },
      create: { productId: product.id, sku: item.sku, priceVnd: item.priceVnd, stockQty: 10, isAvailable: true, weightG: 1_200, packLengthMm: 300, packWidthMm: 300, packHeightMm: 350 },
    });
    const space = await prisma.space.findUniqueOrThrow({ where: { slug: item.space } });
    await prisma.productSpace.upsert({ where: { productId_spaceId: { productId: product.id, spaceId: space.id } }, update: {}, create: { productId: product.id, spaceId: space.id } });
    const style = await prisma.style.findUniqueOrThrow({ where: { slug: item.style } });
    await prisma.productStyle.upsert({ where: { productId_styleId: { productId: product.id, styleId: style.id } }, update: {}, create: { productId: product.id, styleId: style.id } });
  }

  const departments = [
    ["home-appliances", "Home Appliances", 1],
    ["home-decor", "Home Decor", 2],
  ] as const;
  const departmentIds = new Map<string, string>();
  for (const [slug, name, sortOrder] of departments) {
    const department = await prisma.category.upsert({
      where: { slug }, update: { name, sortOrder },
      create: { slug, name, sortOrder, isActive: true },
    });
    departmentIds.set(slug, department.id);
  }
  for (const slug of ["den-tha", "den-ban", "den-op-tran"]) {
    await prisma.category.update({ where: { slug }, data: { parentId: departmentIds.get("home-decor")! } });
  }

  const categoryTree = [
    ["kitchen-appliances", "Kitchen Appliances", "home-appliances", 10],
    ["air-care", "Living & Air Care", "home-appliances", 20],
    ["laundry-utility", "Laundry & Utility", "home-appliances", 30],
    ["tabletop-decor", "Tabletop & Shelf Decor", "home-decor", 10],
    ["wall-decor", "Wall Art & Mirrors", "home-decor", 20],
    ["home-textiles", "Home Textiles", "home-decor", 30],
    ["aromatherapy-greenery", "Aromatherapy & Greenery", "home-decor", 40],
    ["accent-furniture", "Accent Furniture", "home-decor", 50],
  ] as const;
  for (const [slug, name, parentSlug, sortOrder] of categoryTree) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, parentId: departmentIds.get(parentSlug)!, sortOrder },
      create: { slug, name, parentId: departmentIds.get(parentSlug)!, sortOrder, isActive: true },
    });
  }

  const catalogProducts = [
    { slug: "noi-chien-khong-dau-5l", name: "Nồi chiên không dầu 5L", sku: "HA-KIT-001", category: "kitchen-appliances", price: 1_890_000, space: "bep", style: "hien-dai", color: "Đen/Xám", tags: ["bep", "nau_an", "tien_ich"], attrs: { power_w: 1500, capacity_l: 5 } },
    { slug: "noi-com-dien-ih-1-8l", name: "Nồi cơm điện cao tần IH 1.8L", sku: "HA-KIT-002", category: "kitchen-appliances", price: 2_490_000, space: "bep", style: "hien-dai", color: "Trắng/Kem", tags: ["bep", "nau_an"], attrs: { power_w: 1200, capacity_l: 1.8 } },
    { slug: "may-xay-sinh-to-da-nang", name: "Máy xay sinh tố đa năng", sku: "HA-KIT-003", category: "kitchen-appliances", price: 1_190_000, space: "bep", style: "hien-dai", color: "Trắng/Kem", tags: ["bep", "do_uong", "tien_ich"], attrs: { power_w: 800, capacity_l: 1.5 } },
    { slug: "may-ep-cham-gia-dinh", name: "Máy ép trái cây tốc độ chậm", sku: "HA-KIT-004", category: "kitchen-appliances", price: 2_150_000, space: "bep", style: "hien-dai", color: "Đen/Xám", tags: ["bep", "do_uong", "song_khoe"], attrs: { power_w: 200, capacity_l: 0.8 } },
    { slug: "am-sieu-toc-giu-nhiet", name: "Ấm siêu tốc giữ nhiệt", sku: "HA-KIT-005", category: "kitchen-appliances", price: 790_000, space: "bep", style: "bac-au", color: "Trắng/Kem", tags: ["bep", "do_uong"], attrs: { power_w: 1500, capacity_l: 1.7 } },
    { slug: "may-lam-sua-hat", name: "Máy làm sữa hạt đa năng", sku: "HA-KIT-006", category: "kitchen-appliances", price: 1_690_000, space: "bep", style: "hien-dai", color: "Trắng/Kem", tags: ["bep", "nau_an", "song_khoe"], attrs: { power_w: 900, capacity_l: 1.2 } },
    { slug: "may-rua-bat-de-ban", name: "Máy rửa bát để bàn", sku: "HA-KIT-007", category: "kitchen-appliances", price: 5_490_000, space: "bep", style: "hien-dai", color: "Trắng/Kem", tags: ["bep", "don_dep"], attrs: { power_w: 1200, capacity_place_settings: 6 } },
    { slug: "may-pha-ca-phe-espresso", name: "Máy pha cà phê espresso gia đình", sku: "HA-KIT-008", category: "kitchen-appliances", price: 3_290_000, space: "bep", style: "industrial", color: "Đen/Xám", tags: ["bep", "do_uong", "chill"], attrs: { power_w: 1100, pressure_bar: 15 } },
    { slug: "noi-ap-suat-dien-tu", name: "Nồi áp suất điện tử", sku: "HA-KIT-009", category: "kitchen-appliances", price: 1_590_000, space: "bep", style: "hien-dai", color: "Đen/Xám", tags: ["bep", "nau_an"], attrs: { power_w: 1000, capacity_l: 5 } },
    { slug: "bep-tu-doi", name: "Bếp từ đôi mặt kính", sku: "HA-KIT-010", category: "kitchen-appliances", price: 4_490_000, space: "bep", style: "hien-dai", color: "Đen/Xám", tags: ["bep", "nau_an"], attrs: { power_w: 3500, cooking_zones: 2 } },
    { slug: "may-loc-khong-khi-25m2", name: "Máy lọc không khí cho phòng 25m²", sku: "HA-AIR-001", category: "air-care", price: 2_890_000, space: "phong-ngu", style: "hien-dai", color: "Trắng/Kem", tags: ["phong_ngu", "song_khoe", "khong_khi"], attrs: { power_w: 35, coverage_m2: 25, noise_db: 28 } },
    { slug: "robot-hut-bui-tu-do-rac", name: "Robot hút bụi lau nhà tự đổ rác", sku: "HA-AIR-002", category: "air-care", price: 7_990_000, space: "phong-khach", style: "hien-dai", color: "Trắng/Kem", tags: ["don_dep", "phong_khach", "tien_ich"], attrs: { power_w: 50, dust_bin_l: 3, runtime_min: 150 } },
    { slug: "may-hut-am-chong-nom", name: "Máy hút ẩm chống nồm", sku: "HA-AIR-003", price: 3_690_000, category: "air-care", space: "phong-ngu", style: "hien-dai", color: "Trắng/Kem", tags: ["phong_ngu", "khong_khi", "song_khoe"], attrs: { power_w: 250, coverage_m2: 30, extraction_l_day: 12 } },
    { slug: "may-hut-bui-dem-uv", name: "Máy hút bụi đệm giường UV", sku: "HA-AIR-004", price: 1_390_000, category: "air-care", space: "phong-ngu", style: "hien-dai", color: "Trắng/Kem", tags: ["don_dep", "phong_ngu", "song_khoe"], attrs: { power_w: 400, uv: true } },
    { slug: "quat-dung-thong-minh", name: "Quạt đứng thông minh kết nối app", sku: "HA-AIR-005", price: 1_790_000, category: "air-care", space: "phong-khach", style: "hien-dai", color: "Trắng/Kem", tags: ["phong_khach", "lam_mat", "smart_home"], attrs: { power_w: 35, app_control: true } },
    { slug: "may-tao-am-sieu-am", name: "Máy tạo ẩm siêu âm", sku: "HA-AIR-006", price: 890_000, category: "air-care", space: "phong-ngu", style: "bac-au", color: "Trắng/Kem", tags: ["phong_ngu", "khong_khi", "chill"], attrs: { power_w: 25, tank_l: 4, coverage_m2: 25 } },
    { slug: "ban-la-hoi-nuoc-cam-tay", name: "Bàn là hơi nước cầm tay", sku: "HA-UTL-001", price: 690_000, category: "laundry-utility", space: "phong-ngu", style: "hien-dai", color: "Trắng/Kem", tags: ["giat_ui", "tien_ich"], attrs: { power_w: 1200, tank_ml: 150 } },
    { slug: "may-say-quan-ao-mini", name: "Máy sấy quần áo mini gấp gọn", sku: "HA-UTL-002", price: 1_290_000, category: "laundry-utility", space: "phong-ngu", style: "hien-dai", color: "Trắng/Kem", tags: ["giat_ui", "tien_ich", "can_ho_nho"], attrs: { power_w: 600, capacity_kg: 3 } },
    { slug: "den-ngu-gom-wabi", name: "Đèn ngủ gốm Wabi", sku: "HD-TBL-001", price: 690_000, category: "tabletop-decor", space: "phong-ngu", style: "wabi-sabi", color: "Trắng/Kem", tags: ["phong_ngu", "chill", "decor"], attrs: { material: "Gốm và gỗ", light_color: "Ánh sáng ấm" } },
    { slug: "binh-hoa-gom-moc", name: "Bình hoa gốm mộc dáng hữu cơ", sku: "HD-TBL-002", price: 390_000, category: "tabletop-decor", space: "phong-khach", style: "wabi-sabi", color: "Trắng/Kem", tags: ["phong_khach", "decor", "hoa_tuoi"], attrs: { material: "Gốm", height_cm: 24 } },
    { slug: "khay-go-lo-tay", name: "Khay gỗ lót bàn trà", sku: "HD-TBL-003", price: 290_000, category: "tabletop-decor", space: "phong-khach", style: "bac-au", color: "Gỗ tự nhiên", tags: ["phong_khach", "decor", "do_uong"], attrs: { material: "Gỗ sồi", length_cm: 32 } },
    { slug: "dong-ho-go-de-ban", name: "Đồng hồ gỗ LED để bàn", sku: "HD-TBL-004", price: 450_000, category: "tabletop-decor", space: "phong-lam-viec", style: "bac-au", color: "Gỗ tự nhiên", tags: ["phong_lam_viec", "decor", "go_tu_nhien"], attrs: { material: "Gỗ", display: "LED" } },
    { slug: "guong-toan-than-luon-song", name: "Gương soi toàn thân viền lượn sóng", sku: "HD-WAL-001", price: 1_490_000, category: "wall-decor", space: "phong-ngu", style: "hien-dai", color: "Trắng/Kem", tags: ["phong_ngu", "decor", "guong"], attrs: { material: "Kính và gỗ", width_cm: 50, height_cm: 160 } },
    { slug: "tranh-canvas-bac-au", name: "Tranh canvas phong cảnh Bắc Âu", sku: "HD-WAL-002", price: 590_000, category: "wall-decor", space: "phong-khach", style: "bac-au", color: "Pastel", tags: ["phong_khach", "decor", "bac_au"], attrs: { material: "Canvas", width_cm: 60, height_cm: 80 } },
    { slug: "tham-phong-khach-hinh-hoc", name: "Thảm phòng khách họa tiết hình học", sku: "HD-TEX-001", price: 1_190_000, category: "home-textiles", space: "phong-khach", style: "hien-dai", color: "Trắng/Kem", tags: ["phong_khach", "decor", "don_dep"], attrs: { material: "Sợi ngắn", width_cm: 160, length_cm: 230, anti_slip: true } },
    { slug: "goi-tua-sofa-vai-linen", name: "Gối tựa sofa vải linen", sku: "HD-TEX-002", price: 320_000, category: "home-textiles", space: "phong-khach", style: "bac-au", color: "Pastel", tags: ["phong_khach", "decor", "bac_au"], attrs: { material: "Linen", width_cm: 45, length_cm: 45 } },
    { slug: "nen-thom-sap-dau-nanh", name: "Nến thơm sáp đậu nành thủ công", sku: "HD-ARO-001", price: 250_000, category: "aromatherapy-greenery", space: "phong-ngu", style: "wabi-sabi", color: "Trắng/Kem", tags: ["phong_ngu", "chill", "mui_huong"], attrs: { material: "Sáp đậu nành", burn_time_h: 35 } },
    { slug: "cay-gia-monstera", name: "Cây Monstera giả trang trí", sku: "HD-ARO-002", price: 790_000, category: "aromatherapy-greenery", space: "phong-khach", style: "hien-dai", color: "Xanh lá", tags: ["phong_khach", "decor", "cay_xanh"], attrs: { material: "Nhựa và vải", height_cm: 90 } },
    { slug: "ban-tab-dau-giuong", name: "Bàn tab đầu giường gỗ tự nhiên", sku: "HD-ACC-001", price: 990_000, category: "accent-furniture", space: "phong-ngu", style: "bac-au", color: "Gỗ tự nhiên", tags: ["phong_ngu", "decor", "go_tu_nhien"], attrs: { material: "Gỗ cao su", width_cm: 40, height_cm: 48 } },
    { slug: "ghe-luoi-thu-gian", name: "Ghế lười thư giãn", sku: "HD-ACC-002", price: 1_290_000, category: "accent-furniture", space: "phong-khach", style: "hien-dai", color: "Pastel", tags: ["phong_khach", "decor", "chill"], attrs: { material: "Vải canvas", fill: "Hạt xốp" } },
  ] as const;

  const extraDefinitions = [
    ["power_w", "Công suất", "W"], ["capacity_l", "Dung tích", "L"],
    ["coverage_m2", "Diện tích áp dụng", "m²"], ["color_palette", "Bảng màu", null],
    ["design_material", "Chất liệu", null], ["companion_tags", "Tags đồng hành", null],
    ["room_type", "Không gian sử dụng", null],
  ] as const;
  for (const [key, label, unit] of extraDefinitions) {
    await prisma.attributeDefinition.upsert({
      where: { key }, update: { label, type: key === "companion_tags" ? "JSON" : "STRING", unit },
      create: { key, label, type: key === "companion_tags" ? "JSON" : "STRING", unit },
    });
  }
  const extraAttributes = catalogProducts.flatMap((item) => Object.entries(item.attrs));
  const extraKeys = new Set(extraAttributes.map(([key]) => key));
  for (const key of extraKeys) {
    const sample = extraAttributes.find(([attributeKey]) => attributeKey === key)![1];
    const type = typeof sample === "number" ? "NUMBER" : typeof sample === "boolean" ? "BOOLEAN" : "STRING";
    await prisma.attributeDefinition.upsert({
      where: { key }, update: { label: key.replaceAll("_", " "), type },
      create: { key, label: key.replaceAll("_", " "), type },
    });
  }
  const taxonomyValues = {
    spaces: [["bep", "Bếp"], ["phong-lam-viec", "Phòng làm việc"]],
    styles: [["wabi-sabi", "Wabi Sabi"], ["industrial", "Industrial"]],
  } as const;
  for (const [slug, name] of taxonomyValues.spaces) await prisma.space.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  for (const [slug, name] of taxonomyValues.styles) await prisma.style.upsert({ where: { slug }, update: { name }, create: { slug, name } });

  for (const item of catalogProducts) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: `${item.name}. Sản phẩm demo thuộc danh mục ${category.name}, phù hợp không gian ${item.space}, phong cách ${item.style}.`, minPriceVnd: item.price, status: ProductStatus.ACTIVE, isActive: true },
      create: { slug: item.slug, name: item.name, description: `${item.name}. Sản phẩm demo thuộc danh mục ${category.name}, phù hợp không gian ${item.space}, phong cách ${item.style}.`, brandId: brand.id, minPriceVnd: item.price, status: ProductStatus.ACTIVE, isActive: true },
    });
    await prisma.productCategory.upsert({ where: { productId_categoryId: { productId: product.id, categoryId: category.id } }, update: {}, create: { productId: product.id, categoryId: category.id } });
    const attributes: Record<string, unknown> = { ...item.attrs, color_palette: item.color, companion_tags: [...item.tags], room_type: item.space };
    for (const [key, value] of Object.entries(attributes)) {
      const definition = await prisma.attributeDefinition.findUniqueOrThrow({ where: { key } });
      await prisma.productAttribute.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: definition.id } },
        update: { value: value as never },
        create: { productId: product.id, attributeId: definition.id, value: value as never },
      });
    }
    await prisma.variant.upsert({ where: { sku: item.sku }, update: { productId: product.id, priceVnd: item.price, stockQty: 10, isAvailable: true }, create: { productId: product.id, sku: item.sku, priceVnd: item.price, stockQty: 10, isAvailable: true, weightG: 1_000, packLengthMm: 300, packWidthMm: 250, packHeightMm: 200 } });
    const space = await prisma.space.findUniqueOrThrow({ where: { slug: item.space } });
    await prisma.productSpace.upsert({ where: { productId_spaceId: { productId: product.id, spaceId: space.id } }, update: {}, create: { productId: product.id, spaceId: space.id } });
    const style = await prisma.style.findUniqueOrThrow({ where: { slug: item.style } });
    await prisma.productStyle.upsert({ where: { productId_styleId: { productId: product.id, styleId: style.id } }, update: {}, create: { productId: product.id, styleId: style.id } });
  }
}

main().finally(async () => prisma.$disconnect());

