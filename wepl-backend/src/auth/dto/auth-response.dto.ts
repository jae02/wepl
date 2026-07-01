// =============================================================================
// AuthResponseDto - 인증 응답 DTO (회원가입/로그인 공통)
// =============================================================================

/** 응답에 포함될 사용자 정보 (비밀번호 해시 제외) */
export class AuthUserDto {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  provider: string;
  createdAt: Date;
}

/** 회원가입/로그인 성공 시 반환되는 응답 */
export class AuthResponseDto {
  /** JWT 액세스 토큰 */
  accessToken: string;

  /** 사용자 정보 */
  user: AuthUserDto;
}
