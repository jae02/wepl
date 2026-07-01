// =============================================================================
// JoinTripDto - 초대 코드로 여행 참여 요청 DTO
// =============================================================================

import { IsString, IsNotEmpty } from 'class-validator';

export class JoinTripDto {
  /** 초대 코드 (필수) - 8자리 nanoid */
  @IsString()
  @IsNotEmpty({ message: '초대 코드는 필수입니다.' })
  inviteCode: string;
}
