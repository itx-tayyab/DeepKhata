import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('product')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('addcategory')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('write:products')
  async addCategory(@Req() req: any, @Body() body: any) {
    return this.productsService.addCategory(req.user.id, body);
  }

  @Post('addproduct')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('write:products')
  async addProduct(@Req() req: any, @Body() body: any) {
    return this.productsService.addProduct(req.user.id, body);
  }

  @Get('getproducts')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('read:products')
  async getProducts(@Req() req: any, @Query() query: any) {
    return this.productsService.getProducts(req.user.id, query);
  }

  @Get('getcategories')
  async getCategories(@Req() req: any) {
    return this.productsService.getCategories(req.user.id);
  }
}
