import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  CreateCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list() {
    const { rows } = await this.pool.query(
      `SELECT id, code, name, sort_order
         FROM marigold.item_categories
        WHERE deleted_at IS NULL
        ORDER BY sort_order, id`,
    );
    return rows;
  }

  async create(dto: CreateCategoryDto) {
    const dup = await this.pool.query(
      `SELECT id FROM marigold.item_categories
        WHERE (code = $1 OR name = $2) AND deleted_at IS NULL`,
      [dto.code, dto.name],
    );
    if (dup.rows.length > 0) {
      throw new ConflictException('이미 같은 코드 또는 이름의 카테고리가 있습니다.');
    }
    const nextSort = await this.pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS s
         FROM marigold.item_categories WHERE deleted_at IS NULL`,
    );
    const { rows } = await this.pool.query(
      `INSERT INTO marigold.item_categories(code, name, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, sort_order`,
      [dto.code, dto.name, nextSort.rows[0].s],
    );
    return rows[0];
  }

  async update(id: number, dto: UpdateCategoryDto) {
    if (!dto.name) return this.getOne(id);
    const { rows, rowCount } = await this.pool.query(
      `UPDATE marigold.item_categories
          SET name = $2
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, code, name, sort_order`,
      [id, dto.name],
    );
    if (!rowCount) throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    return rows[0];
  }

  async remove(id: number) {
    const { rowCount } = await this.pool.query(
      `UPDATE marigold.item_categories
          SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!rowCount) throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    return { ok: true };
  }

  async reorder(dto: ReorderCategoriesDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const o of dto.orders) {
        await client.query(
          `UPDATE marigold.item_categories
              SET sort_order = $2
            WHERE id = $1 AND deleted_at IS NULL`,
          [o.id, o.sort_order],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    return this.list();
  }

  private async getOne(id: number) {
    const { rows } = await this.pool.query(
      `SELECT id, code, name, sort_order
         FROM marigold.item_categories
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    return rows[0];
  }
}
