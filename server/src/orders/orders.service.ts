import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async newOrder(userId: string, data: any) {
    const {
      customerId,
      items,
      discount = 0,
      amountPaid = 0,
      paymentMethod = 'CASH',
      orderStatus = 'COMPLETED',
    } = data;

    if (!items || items.length === 0)
      throw new BadRequestException('Cart is empty');

    const parsedDiscount = Number(discount) || 0;
    const parsedAmountPaid = Number(amountPaid) || 0;

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId)
      throw new BadRequestException('User does not belong to a workspace');
    const businessId = currentUser.businessId;

    const completeOrder = await this.prisma.$transaction(async (tx) => {
      let calculatedTotal = 0;
      const secureProducts: Record<string, any> = {};

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new Error(`Product not found`);
        if (product.stock < item.quantity) {
          throw new Error(
            `Not enough stock for ${product.name}. Only ${product.stock} left.`,
          );
        }
        secureProducts[item.productId] = product;
        calculatedTotal += product.price * item.quantity;
      }

      const finalGrandTotal = calculatedTotal - parsedDiscount;

      let calculatedPaymentStatus = 'UNPAID';
      if (parsedAmountPaid >= finalGrandTotal) {
        calculatedPaymentStatus = 'PAID';
      } else if (parsedAmountPaid > 0) {
        calculatedPaymentStatus = 'PARTIAL';
      }

      const udhaarRequested = finalGrandTotal - parsedAmountPaid;

      if (udhaarRequested > 0) {
        if (!customerId)
          throw new Error(
            'Walk-in customers must pay in full. Please select or create a customer profile to give Udhaar.',
          );

        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });
        if (!customer)
          throw new Error('Customer profile not found. Cannot process Udhaar.');
        if (customer.isDefaulter)
          throw new Error(
            `SALE BLOCKED: ${customer.name} is marked as a Defaulter.`,
          );
        if (customer.creditLimit === 0)
          throw new Error(
            `SALE BLOCKED: ${customer.name} has a credit limit of Rs. 0.`,
          );

        const totalBilled = await tx.order.aggregate({
          where: { customerId, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        });

        const totalPaid = await tx.payment.aggregate({
          where: { order: { customerId, status: { not: 'CANCELLED' } } },
          _sum: { amount: true },
        });

        const currentOutstanding =
          (totalBilled._sum.totalAmount || 0) - (totalPaid._sum.amount || 0);
        const projectedDebt = currentOutstanding + udhaarRequested;

        if (projectedDebt > customer.creditLimit) {
          const minimumCashRequired = projectedDebt - customer.creditLimit;
          throw new Error(
            `SALE BLOCKED: This exceeds ${customer.name}'s credit limit of Rs. ${customer.creditLimit.toLocaleString()}. You must collect at least Rs. ${minimumCashRequired.toLocaleString()} in cash right now to process this order.`,
          );
        }
      }

      const order = await tx.order.create({
        data: {
          customerId: customerId || null,
          businessId: businessId,
          status: orderStatus,
          discount: parsedDiscount,
          paymentStatus: calculatedPaymentStatus as any,
          totalAmount: finalGrandTotal,
          createdBy: userId,
        },
      });

      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: secureProducts[item.productId].price,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (parsedAmountPaid > 0) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: parsedAmountPaid,
            method: paymentMethod as any,
            receivedBy: userId,
          },
        });
      }

      return order;
    });

    return {
      success: true,
      message: 'Order placed successfully',
      order: completeOrder,
    };
  }

  async getAllOrders(userId: string, query: any) {
    const { search, status, paymentStatus, days = 7 } = query;

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId)
      throw new BadRequestException('User does not belong to a workspace');
    const businessId = currentUser.businessId;

    let queryConditions: any = { businessId: businessId };

    if (days !== 'all' && !isNaN(parseInt(days as string))) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(days as string));
      queryConditions.createdAt = { gte: dateLimit };
    }

    if (status && status !== 'All') queryConditions.status = status;
    if (paymentStatus && paymentStatus !== 'All')
      queryConditions.paymentStatus = paymentStatus;

    if (search) {
      queryConditions.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where: queryConditions,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => {
      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const pendingBalance = order.totalAmount - totalPaid;
      return {
        ...order,
        totalPaid,
        pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
      };
    });

    return { success: true, orders: formattedOrders };
  }

  async getOrderById(userId: string, id: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });

    if (!currentUser?.businessId)
      throw new BadRequestException('User does not belong to a workspace');

    const order = await this.prisma.order.findFirst({
      where: { id, businessId: currentUser.businessId },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true } } } },
        payments: {
          include: { receiver: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        creator: { select: { name: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    return { success: true, order };
  }

  async updateOrderStatus(userId: string, id: string, data: any) {
    const { status } = data;
    if (!status) throw new BadRequestException('Status is required');

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });

    const order = await this.prisma.order.findFirst({
      where: { id, businessId: currentUser.businessId },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const orderItems = await this.prisma.orderItem.findMany({
        where: { orderId: id },
      });
      await this.prisma.$transaction(async (tx) => {
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.order.update({
          where: { id },
          data: { status: status as any },
        });
      });
    } else {
      await this.prisma.order.update({
        where: { id },
        data: { status: status as any },
      });
    }

    return { success: true, message: `Order status updated to ${status}` };
  }

  async recordPayment(userId: string, data: any) {
    const { orderId, amount, method } = data;
    if (!orderId) throw new BadRequestException('Order ID is required');
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0)
      throw new BadRequestException('Valid amount greater than 0 is required');
    if (!method) throw new BadRequestException('Payment method is required');

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { businessId: true },
    });
    if (!currentUser?.businessId)
      throw new BadRequestException('User does not belong to a workspace');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, businessId: currentUser.businessId },
      select: {
        id: true,
        totalAmount: true,
        customerId: true,
        payments: { select: { amount: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const totalPaidSoFar = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = order.totalAmount - totalPaidSoFar;

    if (remainingBalance <= 0)
      throw new BadRequestException('This order is already fully paid.');
    if (parsedAmount > remainingBalance) {
      throw new BadRequestException(
        `Amount exceeds the pending balance. Maximum payable amount is Rs. ${remainingBalance.toLocaleString()}`,
      );
    }

    const newTotalPaid = totalPaidSoFar + parsedAmount;
    const newPaymentStatus =
      newTotalPaid >= order.totalAmount ? 'PAID' : 'PARTIAL';

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: parsedAmount,
          method: method as any,
          receivedBy: userId,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: newPaymentStatus },
      });
    });

    return { success: true, message: 'Payment recorded successfully' };
  }

  async getPublicInvoice(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
        business: {
          select: {
            name: true,
            logoUrl: true,
            address: true,
            phone: true,
            email: true,
            currency: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Invoice not found');

    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = order.totalAmount - totalPaid;

    const formattedInvoice = {
      ...order,
      orderNumber: `ORD-${order.orderNumber || order.id.substring(0, 4)}`,
      totalPaid,
      pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
    };

    return { success: true, invoice: formattedInvoice };
  }
}
