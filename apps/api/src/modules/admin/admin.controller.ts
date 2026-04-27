import { randomUUID } from 'crypto';
import { extname } from 'path';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const imageStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'), false);
  }
};
import { AdminService } from './admin.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateExtraDto } from './dto/create-extra.dto';
import { UpdateExtraDto } from './dto/update-extra.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { StoreService } from '../store/store.service';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly storeService: StoreService,
    private readonly customersService: CustomersService,
  ) {}

  @Get('customers')
  listCustomers(@Query('search') search?: string) {
    return this.customersService.listAll(search);
  }

  // ─── Loyalty ────────────────────────────────────────

  @Post('loyalty/adjust')
  adjustLoyalty(@Body() body: { customerId: string; points: number; description?: string }) {
    return this.customersService.adjustPoints(body.customerId, body.points, body.description);
  }

  // ─── Upload ───────────────────────────────────────

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: imageStorage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: imageFileFilter,
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    return { url: `/uploads/${file.filename}` };
  }

  // ─── Dashboard ─────────────────────────────────────

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── Categories ────────────────────────────────────

  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/reorder')
  reorderCategories(@Body() dto: ReorderDto) {
    return this.adminService.reorderCategories(dto.items);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ─── Products ──────────────────────────────────────

  @Get('products')
  listProducts() {
    return this.adminService.listProducts();
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Patch('products/reorder')
  reorderProducts(@Body() dto: ReorderDto) {
    return this.adminService.reorderProducts(dto.items);
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Patch('products/:id/toggle')
  toggleProduct(@Param('id') id: string) {
    return this.adminService.toggleProduct(id);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // ─── Featured ─────────────────────────────────────

  @Get('featured')
  listFeatured() {
    return this.adminService.listFeatured();
  }

  @Put('featured')
  setFeatured(@Body() body: { productIds: string[] }) {
    return this.adminService.setFeatured(body.productIds);
  }

  // ─── Extras ────────────────────────────────────────

  @Get('products/:productId/extras')
  listExtras(@Param('productId') productId: string) {
    return this.adminService.listExtras(productId);
  }

  @Post('products/:productId/extras')
  createExtra(@Param('productId') productId: string, @Body() dto: CreateExtraDto) {
    return this.adminService.createExtra(productId, dto);
  }

  @Put('extras/:id')
  updateExtra(@Param('id') id: string, @Body() dto: UpdateExtraDto) {
    return this.adminService.updateExtra(id, dto);
  }

  @Delete('extras/:id')
  deleteExtra(@Param('id') id: string) {
    return this.adminService.deleteExtra(id);
  }

  // ─── Option Groups ─────────────────────────────────

  @Get('products/:productId/option-groups')
  listOptionGroups(@Param('productId') productId: string) {
    return this.adminService.listOptionGroups(productId);
  }

  @Post('products/:productId/option-groups')
  createOptionGroup(@Param('productId') productId: string, @Body() dto: CreateOptionGroupDto) {
    return this.adminService.createOptionGroup(productId, dto);
  }

  @Put('option-groups/:id')
  updateOptionGroup(@Param('id') id: string, @Body() dto: UpdateOptionGroupDto) {
    return this.adminService.updateOptionGroup(id, dto);
  }

  @Delete('option-groups/:id')
  deleteOptionGroup(@Param('id') id: string) {
    return this.adminService.deleteOptionGroup(id);
  }

  @Patch('option-groups/reorder')
  reorderOptionGroups(@Body() dto: ReorderDto) {
    return this.adminService.reorderOptionGroups(dto.items);
  }

  // ─── Group Options ────────────────────────────────

  @Post('option-groups/:groupId/options')
  createGroupOption(@Param('groupId') groupId: string, @Body() dto: CreateExtraDto) {
    return this.adminService.createGroupOption(groupId, dto);
  }

  @Put('option-group-options/:id')
  updateGroupOption(@Param('id') id: string, @Body() dto: UpdateExtraDto) {
    return this.adminService.updateGroupOption(id, dto);
  }

  @Delete('option-group-options/:id')
  deleteGroupOption(@Param('id') id: string) {
    return this.adminService.deleteGroupOption(id);
  }

  @Patch('option-group-options/reorder')
  reorderGroupOptions(@Body() dto: ReorderDto) {
    return this.adminService.reorderGroupOptions(dto.items);
  }

  // ─── Orders ────────────────────────────────────────

  @Get('orders')
  listOrders(@Query('status') status?: string) {
    return this.adminService.listOrders(status);
  }

  @Get('orders/history')
  listOrdersHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.listOrdersHistory({
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      search,
      status,
      from,
      to,
    });
  }

  // ─── Store Settings ───────────────────────────────

  @Get('store-settings')
  getStoreSettings() {
    return this.storeService.getSettings();
  }

  @Put('store-settings')
  updateStoreSettings(@Body() data: any) {
    return this.storeService.updateSettings(data);
  }

  @Patch('store-settings/toggle-close')
  async toggleForceClose() {
    const settings = await this.storeService.getSettings();
    return this.storeService.updateSettings({ forceClose: !settings.forceClose });
  }

  @Patch('store-settings/toggle-open')
  async toggleForceOpen() {
    const settings = await this.storeService.getSettings();
    return this.storeService.updateSettings({ forceOpen: !settings.forceOpen });
  }
}
