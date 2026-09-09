import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async addCategory(userId: string, data: any) {
    const { name } = data;
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });
    if (!currentUser?.businessId)
      throw new BadRequestException(
        'User does not have an associated business',
      );

    if (!name || !name.trim())
      throw new BadRequestException('Category name is required');
    const categoryName = name.trim();

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        businessId: currentUser.businessId,
        name: { equals: categoryName, mode: 'insensitive' },
      },
    });
    if (existingCategory)
      throw new ConflictException('Category already exists');

    const category = await this.prisma.category.create({
      data: { name: categoryName, businessId: currentUser.businessId },
    });

    return { message: 'Category Created Successfully', category };
  }

  async getCategories(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });
    if (!currentUser?.businessId)
      throw new BadRequestException('No business found.');

    const categories = await this.prisma.category.findMany({
      where: { businessId: currentUser.businessId },
    });

    return { success: true, categories };
  }

  async addProduct(userId: string, data: any) {
    const { name, price, category, stock, sku } = data;
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });
    if (!currentUser?.businessId)
      throw new BadRequestException(
        'User does not have an associated business',
      );

    const categoryExists = await this.prisma.category.findFirst({
      where: { name: category, businessId: currentUser.businessId },
      select: { id: true },
    });

    if (!categoryExists)
      throw new BadRequestException('Category does not exist');

    const product = await this.prisma.product.create({
      data: {
        name,
        price,
        categoryId: categoryExists.id,
        stock,
        sku,
        businessId: currentUser.businessId,
      },
    });

    return { message: 'Product Created Successfully', product };
  }

  async getProducts(userId: string, query: any) {
    const { search, category, stock } = query;
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });
    if (!currentUser?.businessId)
      throw new BadRequestException('No business found.');

    let queryConditions: any = { businessId: currentUser.businessId };

    if (search) {
      queryConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category && category !== 'All') {
      queryConditions.category = { name: category };
    }
    if (stock === 'out') {
      queryConditions.stock = 0;
    } else if (stock === 'low') {
      queryConditions.stock = { gt: 0, lte: 5 };
    }

    const products = await this.prisma.product.findMany({
      where: queryConditions,
      include: { category: true },
    });

    return { success: true, products };
  }
}
