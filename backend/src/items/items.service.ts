import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  CreateItemDto,
  ReorderItemsDto,
  UpdateItemDto,
} from './dto/item.dto';

@Injectable()
export class ItemsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(categoryId?: number) {
    const params: unknown[] = [];
    let where = `i.deleted_at IS NULL`;
    if (categoryId) {
      params.push(categoryId);
      where += ` AND i.category_id = $${params.length}`;
    }
    const { rows } = await this.pool.query(
      `SELECT i.id, i.category_id, i.code, i.name, i.price,
              i.sort_order, i.is_active,
              c.name AS category_name, c.code AS category_code
         FROM marigold.items i
         JOIN marigold.item_categories c ON c.id = i.category_id
        WHERE ${where}
        ORDER BY i.category_id, i.sort_order, i.id`,
      params,
    );
    return rows;
  }

  async search(q: string) {
    const term = (q ?? '').trim();
    if (!term) return [];
    const { rows } = await this.pool.query(
      `SELECT i.id, i.category_id, i.code, i.name, i.price, i.is_active,
              c.name AS category_name
         FROM marigold.items i
         JOIN marigold.item_categories c ON c.id = i.category_id
        WHERE i.deleted_at IS NULL
          AND (i.code ILIKE $1 OR i.name ILIKE $1)
          AND i.is_active = TRUE
        ORDER BY i.code
        LIMIT 30`,
      [`%${term}%`],
    );
    return rows;
  }

  async create(dto: CreateItemDto) {
    const dup = await this.pool.query(
      `SELECT id FROM marigold.items
        WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
      [dto.code],
    );
    if (dup.rows.length > 0) {
      throw new ConflictException('이미 같은 코드의 물품이 있습니다.');
    }
    const nextSort = await this.pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS s
         FROM marigold.items
        WHERE category_id = $1 AND deleted_at IS NULL`,
      [dto.category_id],
    );
    const { rows } = await this.pool.query(
      `INSERT INTO marigold.items
         (category_id, code, name, price, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, category_id, code, name, price, sort_order, is_active`,
      [
        dto.category_id,
        dto.code,
        dto.name,
        dto.price,
        nextSort.rows[0].s,
      ],
    );
    return rows[0];
  }

  async update(id: number, dto: UpdateItemDto) {
    const { rows, rowCount } = await this.pool.query(
      `UPDATE marigold.items
          SET category_id = COALESCE($2, category_id),
              code        = COALESCE($3, code),
              name        = COALESCE($4, name),
              price       = COALESCE($5, price),
              is_active   = COALESCE($6, is_active)
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, category_id, code, name, price, sort_order, is_active`,
      [
        id,
        dto.category_id ?? null,
        dto.code ?? null,
        dto.name ?? null,
        dto.price ?? null,
        dto.is_active ?? null,
      ],
    );
    if (!rowCount) throw new NotFoundException('물품을 찾을 수 없습니다.');
    return rows[0];
  }

  async remove(id: number) {
    const { rowCount } = await this.pool.query(
      `UPDATE marigold.items
          SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!rowCount) throw new NotFoundException('물품을 찾을 수 없습니다.');
    return { ok: true };
  }

  async reorder(dto: ReorderItemsDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const o of dto.orders) {
        await client.query(
          `UPDATE marigold.items
              SET sort_order = $2
            WHERE id = $1 AND category_id = $3 AND deleted_at IS NULL`,
          [o.id, o.sort_order, dto.category_id],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    return this.list(dto.category_id);
  }
}
