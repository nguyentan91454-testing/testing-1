import { prisma } from '../../core/database/prisma';
import { cacheService } from '../../core/redis/cache.service';
import { NotFoundError } from '../../core/errors/app-error';

export class CategoryService {
  async getAll() {
    const cacheKey = 'categories:all';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    await cacheService.set(cacheKey, categories, 600); // 10 mins
    return categories;
  }

  async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    return category;
  }

  async create(data: { name: string; slug?: string; description?: string; imageUrl?: string; parentId?: string }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
        parentId: data.parentId,
      },
    });

    await cacheService.del('categories:all');
    return category;
  }

  async update(id: string, data: any) {
    const category = await prisma.category.update({
      where: { id },
      data,
    });

    await cacheService.del('categories:all');
    return category;
  }

  async delete(id: string) {
    await prisma.category.delete({ where: { id } });
    await cacheService.del('categories:all');
    return true;
  }
}

export const categoryService = new CategoryService();
