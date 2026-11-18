import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { requireIdempotencyKey } from '../../common/idempotency';
import { StaffKeyGuard } from '../../common/guards/staff-key.guard';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  OrderDetail,
  OrderHistoryPage,
  OrderQuote,
  OrdersService,
  OrderResponse,
} from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OrderResponse> {
    const key = requireIdempotencyKey(idempotencyKey);
    const { order, replayed } = await this.ordersService.createOrder(dto, user.id, key);
    if (replayed) {
      res.status(HttpStatus.OK);
      res.setHeader('Idempotency-Replayed', 'true');
    }
    return order;
  }

  /** Prices a cart with an optional voucher. Writes nothing and reserves no stock. */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  quote(@Body() dto: CreateOrderDto): Promise<OrderQuote> {
    return this.ordersService.quoteOrder(dto);
  }

  // Must stay declared before GET :id so that "me" is not captured as an order id.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  listMine(
    @Query() query: ListMyOrdersQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OrderHistoryPage> {
    return this.ordersService.listMyOrders(user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<OrderDetail> {
    return this.ordersService.getMyOrder(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<OrderDetail> {
    return this.ordersService.cancelMyOrder(id, user.id);
  }

  /** Staff only: X-Staff-Key must match STAFF_API_KEY. The endpoint answers 404 when that env is unset. */
  @Patch(':id/status')
  @UseGuards(StaffKeyGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto): Promise<OrderDetail> {
    return this.ordersService.advanceStatus(id, dto.status);
  }
}
