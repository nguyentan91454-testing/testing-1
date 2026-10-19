import { prisma } from '../../core/database/prisma';
import { cacheService } from '../../core/redis/cache.service';
import { NotFoundError } from '../../core/errors/app-error';

export class BrandService {
  async getAll() {
    const cacheKey = 'brands:all';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    await cacheService.set(cacheKey, brands, 600);
    return brands;
  }

  async getBySlug(slug: string) {
    const brand = await prisma.brand.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new NotFoundError('Không tìm thấy thương hiệu');
    }

    return brand;
  }

  async create(data: { name: string; slug?: string; description?: string; logoUrl?: string }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        logoUrl: data.logoUrl,
      },
    });

    await cacheService.del('brands:all');
    return brand;
  }

  async update(id: string, data: any) {
    const brand = await prisma.brand.update({
      where: { id },
      data,
    });

    await cacheService.del('brands:all');
    return brand;
  }

  async delete(id: string) {
    await prisma.brand.delete({ where: { id } });
    await cacheService.del('brands:all');
    return true;
  }
}

export const brandService = new BrandService();
