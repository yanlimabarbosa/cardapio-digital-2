import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  CustomerAlreadyExistsError,
  CustomerInvalidCredentialsError,
  CustomerInvalidPasswordError,
  CustomerNotFoundError,
  CustomerPasswordAlreadySetError,
  CustomerProfileNotFoundError,
} from './application/errors/customer.errors';
import { GetCustomerLoyaltyUseCase } from './application/use-cases/get-customer-loyalty.use-case';
import { GetCustomerOrderHistoryUseCase } from './application/use-cases/get-customer-order-history.use-case';
import { GetCustomerProfileUseCase } from './application/use-cases/get-customer-profile.use-case';
import { GetCustomerRedeemableProductsUseCase } from './application/use-cases/get-customer-redeemable-products.use-case';
import { IdentifyCustomerUseCase } from './application/use-cases/identify-customer.use-case';
import { LoginCustomerUseCase } from './application/use-cases/login-customer.use-case';
import { RegisterCustomerUseCase } from './application/use-cases/register-customer.use-case';
import { SetCustomerPasswordUseCase } from './application/use-cases/set-customer-password.use-case';
import {
  toCustomerLoyaltyResponseDto,
  toCustomerOrderHistoryResponseDto,
  toCustomerProfileResponseDto,
  toCustomerRedeemableProductsResponseDto,
  toIdentifyCustomerResponseDto,
  toLoginCustomerResponseDto,
  toRegisterCustomerResponseDto,
  toSetCustomerPasswordResponseDto,
} from './customer.mapper';
import { AuthenticatedCustomerRequest } from './authenticated-customer.request';
import { CustomerTokenGuard } from './customer-token.guard';
import { CustomerLoyaltyResponseDto } from './dto/response/customer-loyalty-response.dto';
import { CustomerOrderHistoryResponseDto } from './dto/response/customer-order-history-response.dto';
import { CustomerProfileResponseDto } from './dto/response/customer-profile-response.dto';
import { CustomerRedeemableProductsResponseDto } from './dto/response/customer-redeemable-products-response.dto';
import { IdentifyCustomerResponseDto } from './dto/response/identify-customer-response.dto';
import { LoginCustomerResponseDto } from './dto/response/login-customer-response.dto';
import { RegisterCustomerResponseDto } from './dto/response/register-customer-response.dto';
import { SetCustomerPasswordResponseDto } from './dto/response/set-customer-password-response.dto';
import { IdentifyDto } from './dto/request/identify.dto';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { SetPasswordDto } from './dto/request/set-password.dto';

@Controller('customers')
export class CustomersController {
  public constructor(
    private readonly getCustomerLoyaltyUseCase: GetCustomerLoyaltyUseCase,
    private readonly getCustomerOrderHistoryUseCase: GetCustomerOrderHistoryUseCase,
    private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    private readonly getCustomerRedeemableProductsUseCase: GetCustomerRedeemableProductsUseCase,
    private readonly identifyCustomerUseCase: IdentifyCustomerUseCase,
    private readonly loginCustomerUseCase: LoginCustomerUseCase,
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly setCustomerPasswordUseCase: SetCustomerPasswordUseCase,
  ) {}

  @Post('identify')
  public async identify(@Body() dto: IdentifyDto): Promise<IdentifyCustomerResponseDto> {
    const result = await this.identifyCustomerUseCase.execute({ phone: dto.phone });

    return toIdentifyCustomerResponseDto(result);
  }

  @Post('register')
  public async register(@Body() dto: RegisterDto): Promise<RegisterCustomerResponseDto> {
    try {
      const result = await this.registerCustomerUseCase.execute({
        phone: dto.phone,
        name: dto.name,
        password: dto.password,
      });

      return toRegisterCustomerResponseDto(result);
    } catch (error: unknown) {
      if (error instanceof CustomerAlreadyExistsError) {
        throw new ConflictException('Telefone já cadastrado');
      }

      throw error;
    }
  }

  @Post('login')
  public async login(@Body() dto: LoginDto): Promise<LoginCustomerResponseDto> {
    try {
      const result = await this.loginCustomerUseCase.execute({
        phone: dto.phone,
        password: dto.password,
      });

      return toLoginCustomerResponseDto(result);
    } catch (error: unknown) {
      if (error instanceof CustomerInvalidCredentialsError) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      if (error instanceof CustomerInvalidPasswordError) {
        throw new UnauthorizedException('Senha incorreta');
      }

      throw error;
    }
  }

  @Post('set-password')
  @UseGuards(CustomerTokenGuard)
  public async setPassword(
    @Req() req: AuthenticatedCustomerRequest,
    @Body() dto: SetPasswordDto,
  ): Promise<SetCustomerPasswordResponseDto> {
    try {
      const result = await this.setCustomerPasswordUseCase.execute({
        customerId: req.customer.id,
        password: dto.password,
      });

      return toSetCustomerPasswordResponseDto(result);
    } catch (error: unknown) {
      if (error instanceof CustomerPasswordAlreadySetError) {
        throw new ConflictException('Já possui senha cadastrada');
      }

      if (error instanceof CustomerNotFoundError) {
        throw new NotFoundException('Cliente nao encontrado');
      }

      throw error;
    }
  }

  @Get('me')
  @UseGuards(CustomerTokenGuard)
  public async getProfile(
    @Req() req: AuthenticatedCustomerRequest,
  ): Promise<CustomerProfileResponseDto> {
    try {
      const profile = await this.getCustomerProfileUseCase.execute(req.customer.id);

      return toCustomerProfileResponseDto(profile);
    } catch (error: unknown) {
      if (error instanceof CustomerProfileNotFoundError) {
        throw new NotFoundException('Cliente nao encontrado');
      }

      throw error;
    }
  }

  @Get('orders')
  @UseGuards(CustomerTokenGuard)
  public async getOrders(
    @Req() req: AuthenticatedCustomerRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CustomerOrderHistoryResponseDto> {
    try {
      const orders = await this.getCustomerOrderHistoryUseCase.execute({
        customerId: req.customer.id,
        page: Math.max(1, parseInt(page || '1', 10)),
        limit: Math.min(50, Math.max(1, parseInt(limit || '10', 10))),
      });

      return toCustomerOrderHistoryResponseDto(orders);
    } catch (error: unknown) {
      if (error instanceof CustomerNotFoundError) {
        throw new NotFoundException('Cliente nao encontrado');
      }

      throw error;
    }
  }

  @Get('loyalty')
  @UseGuards(CustomerTokenGuard)
  public async getLoyalty(
    @Req() req: AuthenticatedCustomerRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CustomerLoyaltyResponseDto> {
    try {
      const loyalty = await this.getCustomerLoyaltyUseCase.execute({
        customerId: req.customer.id,
        page: Math.max(1, parseInt(page || '1', 10)),
        limit: Math.min(50, Math.max(1, parseInt(limit || '10', 10))),
      });

      return toCustomerLoyaltyResponseDto(loyalty);
    } catch (error: unknown) {
      if (error instanceof CustomerNotFoundError) {
        throw new NotFoundException('Cliente nao encontrado');
      }

      throw error;
    }
  }

  @Get('loyalty/redeemable')
  @UseGuards(CustomerTokenGuard)
  public async getRedeemableProducts(
    @Req() req: AuthenticatedCustomerRequest,
  ): Promise<CustomerRedeemableProductsResponseDto> {
    try {
      const products = await this.getCustomerRedeemableProductsUseCase.execute(req.customer.id);

      return toCustomerRedeemableProductsResponseDto(products);
    } catch (error: unknown) {
      if (error instanceof CustomerNotFoundError) {
        throw new NotFoundException('Cliente nao encontrado');
      }

      throw error;
    }
  }
}
