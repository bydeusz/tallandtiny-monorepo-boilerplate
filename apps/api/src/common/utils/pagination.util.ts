import { PaginationQueryDto } from '../dto';
import { PaginationMeta } from '../interfaces';

export function buildPaginationMeta(
  query: PaginationQueryDto,
  total: number,
): PaginationMeta {
  const totalPages = total > 0 ? Math.ceil(total / query.limit) : 0;

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1,
  };
}

export function buildPrismaSkipTake(query: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };
}
