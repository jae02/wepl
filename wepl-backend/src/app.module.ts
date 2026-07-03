import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TripModule } from './trip/trip.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CommentModule } from './comment/comment.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ChecklistModule } from './checklist/checklist.module';
import { DiaryModule } from './diary/diary.module';
import { ExpenseModule } from './expense/expense.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TripModule,
    WishlistModule,
    CommentModule,
    ScheduleModule,
    ChecklistModule,
    DiaryModule,
    ExpenseModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}



