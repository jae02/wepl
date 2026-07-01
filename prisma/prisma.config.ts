// =============================================================================
// Prisma 7 Configuration File
// Prisma 7에서는 환경 변수 및 어댑터 설정을 이 파일에서 관리합니다.
// =============================================================================
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
});
