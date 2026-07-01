import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck() {
    try {
      const dbResult = await this.prisma.$queryRaw<
        [{ version: string }]
      >`SELECT version()`;

      // PostGIS 확장 확인
      let postgisVersion = 'NOT INSTALLED';
      try {
        const postgis = await this.prisma.$queryRaw<
          [{ postgis_full_version: string }]
        >`SELECT PostGIS_full_version() as postgis_full_version`;
        postgisVersion = postgis[0].postgis_full_version;
      } catch {
        // PostGIS가 아직 설치되지 않은 경우
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          version: dbResult[0].version,
          postgis: postgisVersion,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: (error as Error).message,
        },
      };
    }
  }
}

