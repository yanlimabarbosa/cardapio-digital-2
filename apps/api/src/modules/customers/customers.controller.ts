import { Controller, Post, Get, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerTokenGuard } from './customer-token.guard';
import { IdentifyDto } from './dto/identify.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('identify')
  identify(@Body() dto: IdentifyDto) {
    return this.customersService.identify(dto.phone);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.customersService.register(dto.phone, dto.name, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.customersService.login(dto.phone, dto.password);
  }

  @Post('set-password')
  @UseGuards(CustomerTokenGuard)
  setPassword(@Req() req: any, @Body() dto: SetPasswordDto) {
    return this.customersService.setPassword(req.customer, dto.password);
  }

  @Get('me')
  @UseGuards(CustomerTokenGuard)
  getProfile(@Req() req: any) {
    return this.customersService.getProfile(req.customer);
  }

  @Get('orders')
  @UseGuards(CustomerTokenGuard)
  getOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getOrders(
      req.customer,
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(50, Math.max(1, parseInt(limit || '10', 10))),
    );
  }

  @Get('loyalty')
  @UseGuards(CustomerTokenGuard)
  getLoyalty(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getLoyalty(
      req.customer,
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(50, Math.max(1, parseInt(limit || '10', 10))),
    );
  }

  @Get('loyalty/redeemable')
  @UseGuards(CustomerTokenGuard)
  getRedeemableProducts(@Req() req: any) {
    return this.customersService.getRedeemableProducts(req.customer);
  }
}
