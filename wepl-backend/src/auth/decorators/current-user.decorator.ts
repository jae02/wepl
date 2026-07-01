// =============================================================================
// @CurrentUser() 파라미터 데코레이터
// JwtAuthGuard가 적용된 엔드포인트에서 request.user를 편리하게 추출
//
// 사용법:
//   @Get('me')
//   @UseGuards(JwtAuthGuard)
//   getMe(@CurrentUser() user: User) { ... }
// =============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 특정 속성만 추출하고 싶을 때: @CurrentUser('id')
    return data ? user?.[data] : user;
  },
);
