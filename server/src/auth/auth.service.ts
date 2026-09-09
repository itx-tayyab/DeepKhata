import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    const { name, email, password } = data;

    const existinguser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existinguser) {
      throw new BadRequestException('Email Already Exist');
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const NewUser = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
      },
    });

    return { user: NewUser };
  }

  async login(data: any, res: Response) {
    const { email, password } = data;

    const existinguser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!existinguser) {
      throw new BadRequestException('Email Not Found');
    }

    const isFound = await bcrypt.compare(password, existinguser.password);
    if (!isFound) {
      throw new UnauthorizedException('Invalid Password');
    }

    const accesstoken = this.jwtService.sign(
      {
        id: existinguser.id,
        role: existinguser.role,
        businessId: existinguser.businessId,
      },
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRATION,
      },
    );

    const refreshtoken = this.jwtService.sign(
      {
        id: existinguser.id,
      },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
      },
    );

    res.cookie('jwt', refreshtoken, {
      httpOnly: true,
      secure: true,
    });

    return res.json({
      message: 'Login successful',
      accessToken: accesstoken,
      user: existinguser,
    });
  }

  logout(res: Response) {
    res.clearCookie('jwt');
    return res.json({ message: 'Logout successful' });
  }
}
