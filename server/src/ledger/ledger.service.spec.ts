import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('LedgerService', () => {
  let service: LedgerService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(),
            transaction: {
              create: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException if postings do not sum to zero', async () => {
    const unbalancedDto = {
      businessId: 'biz-123',
      type: 'SALE',
      postings: [
        { accountId: 'CASH', accountType: 'ASSET', amount: 100 },
        { accountId: 'REVENUE', accountType: 'REVENUE', amount: -90 },
      ],
    };

    await expect(
      service.createBalancedTransaction(unbalancedDto as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should process transaction if postings sum to exactly zero', async () => {
    const balancedDto = {
      businessId: 'biz-123',
      type: 'SALE',
      postings: [
        { accountId: 'CASH', accountType: 'ASSET', amount: 100 },
        { accountId: 'REVENUE', accountType: 'REVENUE', amount: -100 },
      ],
    };

    vi.spyOn(prismaService, '$transaction').mockImplementation(async () => {
      return { id: 'tx-123' };
    });

    const result = await service.createBalancedTransaction(balancedDto as any);
    expect(result).toBeDefined();
    expect(prismaService.$transaction).toHaveBeenCalled();
  });
});
