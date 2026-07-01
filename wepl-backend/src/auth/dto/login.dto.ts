// =============================================================================
// LoginDto - 이메일 로그인 요청 DTO
// =============================================================================

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** 이메일 주소 */
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  /** 비밀번호 */
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(1, { message: '비밀번호를 입력해주세요.' })
  password: string;
}
