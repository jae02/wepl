// =============================================================================
// WishlistModule - 위시리스트 장소 모듈
// PrismaService는 @Global()로 등록되어 있으므로 별도 import 불필요
// =============================================================================

import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [SyncModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
