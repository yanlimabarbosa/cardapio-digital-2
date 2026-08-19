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
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CustomerLoyaltyAdjustmentRejectedError,
  CustomerNotFoundError,
} from '../customers/application/errors/customer.errors';
import { AdjustCustomerLoyaltyUseCase } from '../customers/application/use-cases/adjust-customer-loyalty.use-case';
import { ListAdminCustomersUseCase } from '../customers/application/use-cases/list-admin-customers.use-case';

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
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'), false);
  }
};
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { CreateExtraDto } from './dto/request/create-extra.dto';
import { UpdateExtraDto } from './dto/request/update-extra.dto';
import { ReorderDto } from './dto/request/reorder.dto';
import { CreateOptionGroupDto } from './dto/request/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/request/update-option-group.dto';
import { CreateCombinedLimitDto } from './dto/request/create-combined-limit.dto';
import { UpdateCombinedLimitDto } from './dto/request/update-combined-limit.dto';
import { UpdateStoreSettingsDto } from './dto/request/update-store-settings.dto';
import {
  GetStoreSettingsResult,
  GetStoreSettingsUseCase,
} from '../store/application/use-cases/get-store-settings.use-case';
import { SetStoreModeUseCase } from '../store/application/use-cases/set-store-mode.use-case';
import { ToggleStoreForceCloseUseCase, ToggleStoreForceCloseResult } from '../store/application/use-cases/toggle-store-force-close.use-case';
import { ToggleStoreForceOpenUseCase } from '../store/application/use-cases/toggle-store-force-open.use-case';
import { ClearTestDataUseCase } from './application/use-cases/clear-test-data.use-case';
import { ListDeliveryDriversUseCase, DeliveryDriverModel } from './application/use-cases/list-delivery-drivers.use-case';
import { CreateDeliveryDriverUseCase } from './application/use-cases/create-delivery-driver.use-case';
import { UpdateDeliveryDriverUseCase } from './application/use-cases/update-delivery-driver.use-case';
import { DeleteDeliveryDriverUseCase } from './application/use-cases/delete-delivery-driver.use-case';
import { AssignDriverUseCase, AssignDriverNotFoundError } from './application/use-cases/assign-driver.use-case';
import { CreateDeliveryDriverDto, UpdateDeliveryDriverDto } from './dto/delivery-driver.dto';
import {
  UpdateStoreSettingsResult,
  UpdateStoreSettingsUseCase,
} from '../store/application/use-cases/update-store-settings.use-case';
import { ListAdminCategoriesUseCase } from './application/use-cases/list-admin-categories.use-case';
import { CreateAdminGroupOptionUseCase } from './application/use-cases/create-admin-group-option.use-case';
import { CreateAdminProductExtraUseCase } from './application/use-cases/create-admin-product-extra.use-case';
import { DeleteAdminGroupOptionUseCase } from './application/use-cases/delete-admin-group-option.use-case';
import { DeleteAdminProductExtraUseCase } from './application/use-cases/delete-admin-product-extra.use-case';
import { GetAdminDashboardUseCase } from './application/use-cases/get-admin-dashboard.use-case';
import { UpdateAdminProductExtraUseCase } from './application/use-cases/update-admin-product-extra.use-case';
import { ListAdminFeaturedProductsUseCase } from './application/use-cases/list-admin-featured-products.use-case';
import { ListAdminOptionGroupsUseCase } from './application/use-cases/list-admin-option-groups.use-case';
import { ListAdminOrderHistoryUseCase } from './application/use-cases/list-admin-order-history.use-case';
import { ListAdminOrdersUseCase } from './application/use-cases/list-admin-orders.use-case';
import { ListAdminProductExtrasUseCase } from './application/use-cases/list-admin-product-extras.use-case';
import { ListAdminProductsUseCase } from './application/use-cases/list-admin-products.use-case';
import { ReorderAdminCategoriesUseCase } from './application/use-cases/reorder-admin-categories.use-case';
import { ReorderAdminGroupOptionsUseCase } from './application/use-cases/reorder-admin-group-options.use-case';
import { ReorderAdminOptionGroupsUseCase } from './application/use-cases/reorder-admin-option-groups.use-case';
import { ReorderAdminProductsUseCase } from './application/use-cases/reorder-admin-products.use-case';
import { SetAdminFeaturedProductsUseCase } from './application/use-cases/set-admin-featured-products.use-case';
import { CreateAdminOptionGroupUseCase } from './application/use-cases/create-admin-option-group.use-case';
import { DeleteAdminOptionGroupUseCase } from './application/use-cases/delete-admin-option-group.use-case';
import { UpdateAdminOptionGroupUseCase } from './application/use-cases/update-admin-option-group.use-case';
import { CreateAdminCombinedLimitUseCase } from './application/use-cases/create-admin-combined-limit.use-case';
import { UpdateAdminCombinedLimitUseCase } from './application/use-cases/update-admin-combined-limit.use-case';
import { DeleteAdminCombinedLimitUseCase } from './application/use-cases/delete-admin-combined-limit.use-case';
import { UpdateAdminGroupOptionUseCase } from './application/use-cases/update-admin-group-option.use-case';
import { CreateAdminCategoryUseCase } from './application/use-cases/create-admin-category.use-case';
import {
  AdminCategoryNotFoundError,
  DeleteAdminCategoryUseCase,
} from './application/use-cases/delete-admin-category.use-case';
import {
  AdminProductCategoryNotFoundError,
  AdminProductNotFoundError,
} from './application/errors/admin-product.errors';
import {
  AdminOptionGroupNotFoundError,
  AdminOptionGroupValidationError,
} from './application/errors/admin-option-group.errors';
import { AdminCombinedLimitNotFoundError } from './application/errors/admin-combined-limit.errors';
import {
  AdminGroupOptionNotFoundError,
  AdminProductExtraNotFoundError,
} from './application/errors/admin-product-extra.errors';
import { DeleteAdminProductUseCase } from './application/use-cases/delete-admin-product.use-case';
import { ToggleAdminProductUseCase } from './application/use-cases/toggle-admin-product.use-case';
import { CreateAdminProductUseCase } from './application/use-cases/create-admin-product.use-case';
import { UpdateAdminProductUseCase } from './application/use-cases/update-admin-product.use-case';
import {
  toAdminCategoryMutationResponseDto,
  toAdminCategoryResponseDto,
} from './admin-category.mapper';
import { toAdminDashboardResponseDto } from './admin-dashboard.mapper';
import {
  toAdjustCustomerLoyaltyResponseDto,
  toAdminCustomerResponseDto,
} from './admin-customer.mapper';
import { toAdminOrderHistoryResponseDto } from './admin-order-history.mapper';
import { toAdminOrderResponseDto } from './admin-order.mapper';
import {
  toAdminFeaturedProductResponseDto,
  toAdminGroupOptionMutationResponseDto,
  toAdminGroupOptionResponseDto,
  toAdminProductOptionGroupResponseDto,
  toAdminProductExtraListResponseDto,
  toAdminProductExtraMutationResponseDto,
  toAdminProductMutationResponseDto,
  toAdminProductResponseDto,
} from './admin-product.mapper';
import {
  UpdateAdminCategoryNotFoundError,
  UpdateAdminCategoryUseCase,
} from './application/use-cases/update-admin-category.use-case';
import { AdminCategoryResponseDto } from './dto/response/admin-category-response.dto';
import { AdminFeaturedProductResponseDto } from './dto/response/admin-featured-product-response.dto';
import { AdminGroupOptionMutationResponseDto } from './dto/response/admin-group-option-mutation-response.dto';
import { AdminProductExtraMutationResponseDto } from './dto/response/admin-product-extra-mutation-response.dto';
import { AdminProductExtraListResponseDto } from './dto/response/admin-product-extra-response.dto';
import { AdminProductMutationResponseDto } from './dto/response/admin-product-mutation-response.dto';
import {
  AdminProductExtraResponseDto,
  AdminProductOptionGroupResponseDto,
  AdminProductResponseDto,
} from './dto/response/admin-product-response.dto';
import { ReorderCategoriesResponseDto } from './dto/response/reorder-categories-response.dto';
import { ReorderGroupOptionsResponseDto } from './dto/response/reorder-group-options-response.dto';
import { ReorderOptionGroupsResponseDto } from './dto/response/reorder-option-groups-response.dto';
import { ReorderProductsResponseDto } from './dto/response/reorder-products-response.dto';
import { DeleteCategoryResponseDto } from './dto/response/delete-category-response.dto';
import { DeleteExtraResponseDto } from './dto/response/delete-extra-response.dto';
import { DeleteGroupOptionResponseDto } from './dto/response/delete-group-option-response.dto';
import { DeleteOptionGroupResponseDto } from './dto/response/delete-option-group-response.dto';
import { DeleteCombinedLimitResponseDto } from './dto/response/delete-combined-limit-response.dto';
import { DeleteProductResponseDto } from './dto/response/delete-product-response.dto';
import { ToggleProductResponseDto } from './dto/response/toggle-product-response.dto';
import { AdminCategoryMutationResponseDto } from './dto/response/admin-category-mutation-response.dto';
import { SetFeaturedProductsDto } from './dto/request/set-featured-products.dto';
import { SetFeaturedProductsResponseDto } from './dto/response/set-featured-products-response.dto';
import { AdminDashboardResponseDto } from './dto/response/admin-dashboard-response.dto';
import { AdminCustomerResponseDto } from './dto/response/admin-customer-response.dto';
import { AdjustCustomerLoyaltyDto } from './dto/request/adjust-customer-loyalty.dto';
import { AdjustCustomerLoyaltyResponseDto } from './dto/response/adjust-customer-loyalty-response.dto';
import { AdminOrderHistoryResponseDto } from './dto/response/admin-order-history-response.dto';
import { AdminOrderResponseDto } from './dto/response/admin-order-response.dto';
import { ListAdminOrderHistoryQueryDto } from './dto/request/list-admin-order-history-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  public constructor(
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
    private readonly listAdminCategoriesUseCase: ListAdminCategoriesUseCase,
    private readonly listAdminProductsUseCase: ListAdminProductsUseCase,
    private readonly listAdminFeaturedProductsUseCase: ListAdminFeaturedProductsUseCase,
    private readonly listAdminProductExtrasUseCase: ListAdminProductExtrasUseCase,
    private readonly listAdminOptionGroupsUseCase: ListAdminOptionGroupsUseCase,
    private readonly listAdminOrdersUseCase: ListAdminOrdersUseCase,
    private readonly listAdminOrderHistoryUseCase: ListAdminOrderHistoryUseCase,
    private readonly createAdminOptionGroupUseCase: CreateAdminOptionGroupUseCase,
    private readonly deleteAdminOptionGroupUseCase: DeleteAdminOptionGroupUseCase,
    private readonly updateAdminOptionGroupUseCase: UpdateAdminOptionGroupUseCase,
    private readonly createAdminCombinedLimitUseCase: CreateAdminCombinedLimitUseCase,
    private readonly updateAdminCombinedLimitUseCase: UpdateAdminCombinedLimitUseCase,
    private readonly deleteAdminCombinedLimitUseCase: DeleteAdminCombinedLimitUseCase,
    private readonly createAdminGroupOptionUseCase: CreateAdminGroupOptionUseCase,
    private readonly updateAdminGroupOptionUseCase: UpdateAdminGroupOptionUseCase,
    private readonly createAdminProductExtraUseCase: CreateAdminProductExtraUseCase,
    private readonly deleteAdminGroupOptionUseCase: DeleteAdminGroupOptionUseCase,
    private readonly deleteAdminProductExtraUseCase: DeleteAdminProductExtraUseCase,
    private readonly updateAdminProductExtraUseCase: UpdateAdminProductExtraUseCase,
    private readonly reorderAdminCategoriesUseCase: ReorderAdminCategoriesUseCase,
    private readonly reorderAdminGroupOptionsUseCase: ReorderAdminGroupOptionsUseCase,
    private readonly reorderAdminOptionGroupsUseCase: ReorderAdminOptionGroupsUseCase,
    private readonly reorderAdminProductsUseCase: ReorderAdminProductsUseCase,
    private readonly setAdminFeaturedProductsUseCase: SetAdminFeaturedProductsUseCase,
    private readonly deleteAdminCategoryUseCase: DeleteAdminCategoryUseCase,
    private readonly deleteAdminProductUseCase: DeleteAdminProductUseCase,
    private readonly toggleAdminProductUseCase: ToggleAdminProductUseCase,
    private readonly createAdminProductUseCase: CreateAdminProductUseCase,
    private readonly updateAdminProductUseCase: UpdateAdminProductUseCase,
    private readonly updateAdminCategoryUseCase: UpdateAdminCategoryUseCase,
    private readonly createAdminCategoryUseCase: CreateAdminCategoryUseCase,
    private readonly getStoreSettingsUseCase: GetStoreSettingsUseCase,
    private readonly updateStoreSettingsUseCase: UpdateStoreSettingsUseCase,
    private readonly setStoreMode: SetStoreModeUseCase,
    private readonly toggleStoreForceClose: ToggleStoreForceCloseUseCase,
    private readonly toggleStoreForceOpen: ToggleStoreForceOpenUseCase,
    private readonly clearTestData: ClearTestDataUseCase,
    private readonly listDeliveryDriversUseCase: ListDeliveryDriversUseCase,
    private readonly createDeliveryDriverUseCase: CreateDeliveryDriverUseCase,
    private readonly updateDeliveryDriverUseCase: UpdateDeliveryDriverUseCase,
    private readonly deleteDeliveryDriverUseCase: DeleteDeliveryDriverUseCase,
    private readonly assignDriverUseCase: AssignDriverUseCase,
    private readonly listAdminCustomersUseCase: ListAdminCustomersUseCase,
    private readonly adjustCustomerLoyaltyUseCase: AdjustCustomerLoyaltyUseCase,
  ) {}

  @Get('customers')
  public async listCustomers(@Query('search') search?: string): Promise<AdminCustomerResponseDto[]> {
    const customers = await this.listAdminCustomersUseCase.execute(search);

    return customers.map(toAdminCustomerResponseDto);
  }

  // ─── Loyalty ────────────────────────────────────────

  @Post('loyalty/adjust')
  public async adjustLoyalty(
    @Body() body: AdjustCustomerLoyaltyDto,
  ): Promise<AdjustCustomerLoyaltyResponseDto> {
    try {
      const result = await this.adjustCustomerLoyaltyUseCase.execute({
        customerId: body.customerId,
        points: body.points,
        description: body.description,
      });

      return toAdjustCustomerLoyaltyResponseDto(result);
    } catch (error: unknown) {
      if (error instanceof CustomerNotFoundError) {
        throw new NotFoundException('Cliente nao encontrado');
      }

      if (error instanceof CustomerLoyaltyAdjustmentRejectedError) {
        throw new BadRequestException(error.reason);
      }

      throw error;
    }
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
  public async getDashboard(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<AdminDashboardResponseDto> {
    const dashboard = await this.getAdminDashboardUseCase.execute({
      from: this.parseDateQuery(from, 'from'),
      to: this.parseDateQuery(to, 'to'),
    });

    return toAdminDashboardResponseDto(dashboard);
  }

  private parseDateQuery(value: string | undefined, field: 'from' | 'to'): Date | undefined {
    if (!value) return undefined;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Filtro ${field} inválido`);
    }

    return date;
  }

  // ─── Categories ────────────────────────────────────

  @Get('categories')
  public async listCategories(): Promise<AdminCategoryResponseDto[]> {
    const categories = await this.listAdminCategoriesUseCase.execute();

    return categories.map(toAdminCategoryResponseDto);
  }

  @Post('categories')
  public async createCategory(@Body() dto: CreateCategoryDto): Promise<AdminCategoryMutationResponseDto> {
    const category = await this.createAdminCategoryUseCase.execute({
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder,
      availabilitySchedule: dto.availabilitySchedule,
    });

    return toAdminCategoryMutationResponseDto(category);
  }

  @Patch('categories/reorder')
  public async reorderCategories(@Body() dto: ReorderDto): Promise<ReorderCategoriesResponseDto> {
    const result = await this.reorderAdminCategoriesUseCase.execute({ items: dto.items });

    return new ReorderCategoriesResponseDto(result.success);
  }

  @Put('categories/:id')
  public async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<AdminCategoryMutationResponseDto> {
    try {
      const category = await this.updateAdminCategoryUseCase.execute({
        id,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        availabilitySchedule: dto.availabilitySchedule,
      });

      return toAdminCategoryMutationResponseDto(category);
    } catch (error) {
      if (error instanceof UpdateAdminCategoryNotFoundError) {
        throw new NotFoundException('Category not found');
      }

      throw error;
    }
  }

  @Delete('categories/:id')
  public async deleteCategory(@Param('id') id: string): Promise<DeleteCategoryResponseDto> {
    try {
      const result = await this.deleteAdminCategoryUseCase.execute({ id });

      return new DeleteCategoryResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminCategoryNotFoundError) {
        throw new NotFoundException('Category not found');
      }

      throw error;
    }
  }

  // ─── Products ──────────────────────────────────────

  @Get('products')
  public async listProducts(): Promise<AdminProductResponseDto[]> {
    const products = await this.listAdminProductsUseCase.execute();

    return products.map(toAdminProductResponseDto);
  }

  @Post('products')
  public async createProduct(@Body() dto: CreateProductDto): Promise<AdminProductMutationResponseDto> {
    try {
      const product = await this.createAdminProductUseCase.execute({
        name: dto.name,
        categoryId: dto.categoryId,
        price: dto.price,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isCompound: dto.isCompound,
        isRedeemable: dto.isRedeemable,
        redemptionCost: dto.redemptionCost,
      });

      return toAdminProductMutationResponseDto(product);
    } catch (error) {
      if (error instanceof AdminProductCategoryNotFoundError) {
        throw new NotFoundException('Category not found');
      }

      throw error;
    }
  }

  @Patch('products/reorder')
  public async reorderProducts(@Body() dto: ReorderDto): Promise<ReorderProductsResponseDto> {
    const result = await this.reorderAdminProductsUseCase.execute({ items: dto.items });

    return new ReorderProductsResponseDto(result.success);
  }

  @Put('products/:id')
  public async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<AdminProductMutationResponseDto> {
    try {
      const product = await this.updateAdminProductUseCase.execute({
        id,
        name: dto.name,
        categoryId: dto.categoryId,
        price: dto.price,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
        isSoldOut: dto.isSoldOut,
        isPromotional: dto.isPromotional,
        promotionalPrice: dto.promotionalPrice,
        promotionStartDate: dto.promotionStartDate,
        promotionEndDate: dto.promotionEndDate,
        isCompound: dto.isCompound,
        isRedeemable: dto.isRedeemable,
        redemptionCost: dto.redemptionCost,
      });

      return toAdminProductMutationResponseDto(product);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      if (error instanceof AdminProductCategoryNotFoundError) {
        throw new NotFoundException('Category not found');
      }

      throw error;
    }
  }

  @Patch('products/:id/toggle')
  public async toggleProduct(@Param('id') id: string): Promise<ToggleProductResponseDto> {
    try {
      const result = await this.toggleAdminProductUseCase.execute({ id });

      return new ToggleProductResponseDto(result.id, result.isActive);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  @Delete('products/:id')
  public async deleteProduct(@Param('id') id: string): Promise<DeleteProductResponseDto> {
    try {
      const result = await this.deleteAdminProductUseCase.execute({ id });

      return new DeleteProductResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  // ─── Featured ─────────────────────────────────────

  @Get('featured')
  public async listFeatured(): Promise<AdminFeaturedProductResponseDto[]> {
    const products = await this.listAdminFeaturedProductsUseCase.execute();

    return products.map(toAdminFeaturedProductResponseDto);
  }

  @Put('featured')
  public async setFeatured(@Body() dto: SetFeaturedProductsDto): Promise<SetFeaturedProductsResponseDto> {
    const result = await this.setAdminFeaturedProductsUseCase.execute({ productIds: dto.productIds });

    return new SetFeaturedProductsResponseDto(result.success);
  }

  // ─── Extras ────────────────────────────────────────

  @Get('products/:productId/extras')
  public async listExtras(
    @Param('productId') productId: string,
  ): Promise<AdminProductExtraListResponseDto[]> {
    try {
      const extras = await this.listAdminProductExtrasUseCase.execute({ productId });

      return extras.map(toAdminProductExtraListResponseDto);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  @Post('products/:productId/extras')
  public async createExtra(
    @Param('productId') productId: string,
    @Body() dto: CreateExtraDto,
  ): Promise<AdminProductExtraMutationResponseDto> {
    try {
      const extra = await this.createAdminProductExtraUseCase.execute({
        productId,
        name: dto.name,
        price: dto.price,
        imageUrl: dto.imageUrl,
      });

      return toAdminProductExtraMutationResponseDto(extra);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  @Put('extras/:id')
  public async updateExtra(
    @Param('id') id: string,
    @Body() dto: UpdateExtraDto,
  ): Promise<AdminProductExtraMutationResponseDto> {
    try {
      const extra = await this.updateAdminProductExtraUseCase.execute({
        id,
        name: dto.name,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
        isSoldOut: dto.isSoldOut,
      });

      return toAdminProductExtraMutationResponseDto(extra);
    } catch (error) {
      if (error instanceof AdminProductExtraNotFoundError) {
        throw new NotFoundException('Extra not found');
      }

      throw error;
    }
  }

  @Delete('extras/:id')
  public async deleteExtra(@Param('id') id: string): Promise<DeleteExtraResponseDto> {
    try {
      const result = await this.deleteAdminProductExtraUseCase.execute({ id });

      return new DeleteExtraResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminProductExtraNotFoundError) {
        throw new NotFoundException('Extra not found');
      }

      throw error;
    }
  }

  // ─── Option Groups ─────────────────────────────────

  @Get('products/:productId/option-groups')
  public async listOptionGroups(
    @Param('productId') productId: string,
  ): Promise<AdminProductOptionGroupResponseDto[]> {
    try {
      const optionGroups = await this.listAdminOptionGroupsUseCase.execute({ productId });

      return optionGroups.map(toAdminProductOptionGroupResponseDto);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  @Post('products/:productId/option-groups')
  public async createOptionGroup(
    @Param('productId') productId: string,
    @Body() dto: CreateOptionGroupDto,
  ): Promise<AdminProductOptionGroupResponseDto> {
    try {
      const optionGroup = await this.createAdminOptionGroupUseCase.execute({
        productId,
        name: dto.name,
        minSelections: dto.minSelections,
        maxSelections: dto.maxSelections,
        sortOrder: dto.sortOrder,
      });

      return toAdminProductOptionGroupResponseDto(optionGroup);
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      if (error instanceof AdminOptionGroupValidationError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Put('option-groups/:id')
  public async updateOptionGroup(
    @Param('id') id: string,
    @Body() dto: UpdateOptionGroupDto,
  ): Promise<AdminProductOptionGroupResponseDto> {
    try {
      const optionGroup = await this.updateAdminOptionGroupUseCase.execute({
        id,
        name: dto.name,
        minSelections: dto.minSelections,
        maxSelections: dto.maxSelections,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        combinedLimitId: dto.combinedLimitId,
      });

      return toAdminProductOptionGroupResponseDto(optionGroup);
    } catch (error) {
      if (error instanceof AdminOptionGroupNotFoundError) {
        throw new NotFoundException('Option group not found');
      }

      if (error instanceof AdminOptionGroupValidationError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Delete('option-groups/:id')
  public async deleteOptionGroup(@Param('id') id: string): Promise<DeleteOptionGroupResponseDto> {
    try {
      const result = await this.deleteAdminOptionGroupUseCase.execute({ id });

      return new DeleteOptionGroupResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminOptionGroupNotFoundError) {
        throw new NotFoundException('Option group not found');
      }

      throw error;
    }
  }

  @Patch('option-groups/reorder')
  public async reorderOptionGroups(@Body() dto: ReorderDto): Promise<ReorderOptionGroupsResponseDto> {
    const result = await this.reorderAdminOptionGroupsUseCase.execute({ items: dto.items });

    return new ReorderOptionGroupsResponseDto(result.success);
  }

  // ─── Combined Limits ──────────────────────────────

  @Post('products/:productId/combined-limits')
  public async createCombinedLimit(
    @Param('productId') productId: string,
    @Body() dto: CreateCombinedLimitDto,
  ): Promise<{ id: string; name: string; maxSelections: number }> {
    try {
      const combinedLimit = await this.createAdminCombinedLimitUseCase.execute({
        productId,
        name: dto.name,
        maxSelections: dto.maxSelections,
      });

      return combinedLimit;
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  @Patch('combined-limits/:id')
  public async updateCombinedLimit(
    @Param('id') id: string,
    @Body() dto: UpdateCombinedLimitDto,
  ): Promise<{ id: string; name: string; maxSelections: number }> {
    try {
      const combinedLimit = await this.updateAdminCombinedLimitUseCase.execute({
        id,
        name: dto.name,
        maxSelections: dto.maxSelections,
      });

      return combinedLimit;
    } catch (error) {
      if (error instanceof AdminCombinedLimitNotFoundError) {
        throw new NotFoundException('Combined limit not found');
      }

      throw error;
    }
  }

  @Delete('combined-limits/:id')
  public async deleteCombinedLimit(
    @Param('id') id: string,
  ): Promise<DeleteCombinedLimitResponseDto> {
    try {
      const result = await this.deleteAdminCombinedLimitUseCase.execute({ id });

      return new DeleteCombinedLimitResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminCombinedLimitNotFoundError) {
        throw new NotFoundException('Combined limit not found');
      }

      throw error;
    }
  }

  // ─── Group Options ────────────────────────────────

  @Post('option-groups/:groupId/options')
  public async createGroupOption(
    @Param('groupId') groupId: string,
    @Body() dto: CreateExtraDto,
  ): Promise<AdminProductExtraResponseDto> {
    try {
      const option = await this.createAdminGroupOptionUseCase.execute({
        groupId,
        name: dto.name,
        price: dto.price,
        imageUrl: dto.imageUrl,
      });

      return toAdminGroupOptionResponseDto(option);
    } catch (error) {
      if (error instanceof AdminOptionGroupNotFoundError) {
        throw new NotFoundException('Option group not found');
      }

      throw error;
    }
  }

  @Put('option-group-options/:id')
  public async updateGroupOption(
    @Param('id') id: string,
    @Body() dto: UpdateExtraDto,
  ): Promise<AdminGroupOptionMutationResponseDto> {
    try {
      const option = await this.updateAdminGroupOptionUseCase.execute({
        id,
        name: dto.name,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
        isSoldOut: dto.isSoldOut,
      });

      return toAdminGroupOptionMutationResponseDto(option);
    } catch (error) {
      if (error instanceof AdminGroupOptionNotFoundError) {
        throw new NotFoundException('Option not found');
      }

      throw error;
    }
  }

  @Delete('option-group-options/:id')
  public async deleteGroupOption(@Param('id') id: string): Promise<DeleteGroupOptionResponseDto> {
    try {
      const result = await this.deleteAdminGroupOptionUseCase.execute({ id });

      return new DeleteGroupOptionResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminGroupOptionNotFoundError) {
        throw new NotFoundException('Option not found');
      }

      throw error;
    }
  }

  @Patch('option-group-options/reorder')
  public async reorderGroupOptions(@Body() dto: ReorderDto): Promise<ReorderGroupOptionsResponseDto> {
    const result = await this.reorderAdminGroupOptionsUseCase.execute({ items: dto.items });

    return new ReorderGroupOptionsResponseDto(result.success);
  }

  // ─── Orders ────────────────────────────────────────

  @Get('orders')
  public async listOrders(@Query('status') status?: string): Promise<AdminOrderResponseDto[]> {
    const orders = await this.listAdminOrdersUseCase.execute({ status });

    return orders.map(toAdminOrderResponseDto);
  }

  @Get('orders/history')
  public async listOrdersHistory(
    @Query() query: ListAdminOrderHistoryQueryDto,
  ): Promise<AdminOrderHistoryResponseDto> {
    const result = await this.listAdminOrderHistoryUseCase.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      from: query.from,
      to: query.to,
    });

    return toAdminOrderHistoryResponseDto(result);
  }

  // ─── Store Settings ───────────────────────────────

  @Get('store-settings')
  public getStoreSettings(): Promise<GetStoreSettingsResult> {
    return this.getStoreSettingsUseCase.execute();
  }

  @Put('store-settings')
  public updateStoreSettings(@Body() data: UpdateStoreSettingsDto): Promise<UpdateStoreSettingsResult> {
    return this.updateStoreSettingsUseCase.execute({ data });
  }

  @Patch('store-settings/toggle-close')
  public toggleForceClose(): Promise<ToggleStoreForceCloseResult> {
    return this.toggleStoreForceClose.execute();
  }

  @Patch('store-settings/toggle-open')
  public async toggleStoreForceOpenSettings(): Promise<void> {
    await this.toggleStoreForceOpen.execute();
  }

  @Post('system/clear-data')
  public async handleClearTestData(): Promise<{ success: boolean; message: string }> {
    return this.clearTestData.execute();
  }

  @Get('drivers')
  public listDrivers(): Promise<DeliveryDriverModel[]> {
    return this.listDeliveryDriversUseCase.execute();
  }

  @Post('drivers')
  public createDriver(@Body() dto: CreateDeliveryDriverDto): Promise<{ id: string }> {
    return this.createDeliveryDriverUseCase.execute(dto);
  }

  @Put('drivers/:id')
  public async updateDriver(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDriverDto,
  ): Promise<{ success: boolean }> {
    await this.updateDeliveryDriverUseCase.execute({ id, ...dto });
    return { success: true };
  }

  @Delete('drivers/:id')
  public async deleteDriver(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.deleteDeliveryDriverUseCase.execute(id);
    return { success: true };
  }

  @Patch('orders/:id/driver')
  public async assignDriver(
    @Param('id') id: string,
    @Body() body: { driverId: string },
  ): Promise<{ success: boolean }> {
    try {
      await this.assignDriverUseCase.execute({ orderId: id, driverId: body.driverId });
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof AssignDriverNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
