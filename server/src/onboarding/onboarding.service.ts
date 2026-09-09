import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async businessOnboarding(data: any) {
    const {
      name,
      industry,
      teamSize,
      currency,
      phone,
      address,
      slug,
      ownerId,
    } = data;

    if (!ownerId) {
      throw new BadRequestException('ownerId is required');
    }

    const existingBusiness = await this.prisma.business.findUnique({
      where: { slug },
    });

    if (existingBusiness) {
      throw new BadRequestException('Business Slug Already Exists');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newBusiness = await tx.business.create({
        data: {
          name,
          industry,
          teamSize,
          currency,
          slug,
          phone,
          address,
          ownerId,
        },
      });

      await tx.user.update({
        where: { id: ownerId },
        data: {
          role: 'OWNER',
          businessId: newBusiness.id,
        },
      });

      return newBusiness;
    });

    return {
      message: 'Business Onboarding Successful',
      business: result,
    };
  }
}
