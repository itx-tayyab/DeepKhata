import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from '../utils/cloudinary.storage';

@Controller('settings')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profileinfo')
  async profileInfo(@Req() req: any) {
    return this.settingsService.profileInfo(req.user.id);
  }

  @Get('businessinfo')
  async businessInfo(@Req() req: any) {
    return this.settingsService.businessInfo(req.user.id);
  }

  @Put('updateprofileinfo')
  @UseInterceptors(FileInterceptor('avatar', { storage }))
  async updateProfileInfo(
    @Req() req: any,
    @Body() body: any,
    @UploadedFile() file: any,
  ) {
    return this.settingsService.updateProfileInfo(req.user.id, body, file);
  }

  @Put('updatebusinessinfo')
  @UseInterceptors(FileInterceptor('logo', { storage }))
  async updateBusinessInfo(
    @Req() req: any,
    @Body() body: any,
    @UploadedFile() file: any,
  ) {
    return this.settingsService.updateBusinessInfo(req.user.id, body, file);
  }
}
