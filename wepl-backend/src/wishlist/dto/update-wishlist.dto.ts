// =============================================================================
// UpdateWishlistDto - 위시리스트 장소 수정 DTO
// CreateWishlistDto의 모든 필드를 선택적으로 변환
// =============================================================================

import { PartialType } from '@nestjs/mapped-types';
import { CreateWishlistDto } from './create-wishlist.dto';

export class UpdateWishlistDto extends PartialType(CreateWishlistDto) {}
