import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { OrderDetail, OrderHistoryPage, OrdersService, OrderResponse } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser): Promise<OrderResponse> {
    return this.ordersService.createOrder(dto, user.id);
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
}
