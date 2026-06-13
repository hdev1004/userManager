import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async search(q: string) {
    const term = (q ?? '').trim();
    if (!term) return [];

    const isNumeric = /^\d+$/.test(term);
    const params: unknown[] = [];
    let where = `deleted_at IS NULL`;

    if (isNumeric && term.length === 4) {
      params.push(term);
      where += ` AND phone IS NOT NULL AND RIGHT(phone, 4) = $${params.length}`;
    } else if (isNumeric) {
      params.push(`%${term}%`);
      where += ` AND phone LIKE $${params.length}`;
    } else {
      params.push(`%${term}%`);
      where += ` AND name LIKE $${params.length}`;
    }

    const { rows } = await this.pool.query(
      `SELECT id, name, phone, point, visit_count, updated_at
         FROM marigold.members
        WHERE ${where}
        ORDER BY updated_at DESC
        LIMIT 50`,
      params,
    );
    return rows;
  }

  async getById(id: number) {
    const { rows } = await this.pool.query(
      `SELECT id, name, phone, point, visit_count, memo, created_at, updated_at
         FROM marigold.members
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('회원을 찾을 수 없습니다.');
    return rows[0];
  }

  async create(dto: CreateMemberDto) {
    const phone = this.normalizePhone(dto.phone);
    if (phone) {
      const dup = await this.pool.query(
        `SELECT id FROM marigold.members
          WHERE phone = $1 AND deleted_at IS NULL LIMIT 1`,
        [phone],
      );
      if (dup.rows.length > 0) {
        throw new ConflictException('이미 등록된 전화번호입니다.');
      }
    }
    const { rows } = await this.pool.query(
      `INSERT INTO marigold.members(name, phone, point, memo)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, point, visit_count, memo, created_at, updated_at`,
      [dto.name, phone, dto.point ?? 0, dto.memo ?? null],
    );
    return rows[0];
  }

  async update(id: number, dto: UpdateMemberDto, adminId: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const cur = await client.query(
        `SELECT id, name, phone, point, memo
           FROM marigold.members
          WHERE id = $1 AND deleted_at IS NULL
          FOR UPDATE`,
        [id],
      );
      if (cur.rows.length === 0) {
        throw new NotFoundException('회원을 찾을 수 없습니다.');
      }
      const before = cur.rows[0];

      const phoneClean = dto.phone !== undefined ? this.normalizePhone(dto.phone) : before.phone;

      if (
        dto.phone !== undefined &&
        phoneClean &&
        phoneClean !== before.phone
      ) {
        const dup = await client.query(
          `SELECT id FROM marigold.members
            WHERE phone = $1 AND deleted_at IS NULL AND id <> $2 LIMIT 1`,
          [phoneClean, id],
        );
        if (dup.rows.length > 0) {
          throw new ConflictException('이미 등록된 전화번호입니다.');
        }
      }

      const updRes = await client.query(
        `UPDATE marigold.members SET
            name  = COALESCE($2, name),
            phone = CASE WHEN $3::boolean THEN $4 ELSE phone END,
            point = COALESCE($5, point),
            memo  = CASE WHEN $6::boolean THEN $7 ELSE memo END
          WHERE id = $1
          RETURNING id, name, phone, point, visit_count, memo, created_at, updated_at`,
        [
          id,
          dto.name ?? null,
          dto.phone !== undefined,
          phoneClean,
          dto.point ?? null,
          dto.memo !== undefined,
          dto.memo ?? null,
        ],
      );
      const after = updRes.rows[0];

      const changedFields: { field: string; before: string | null; after: string | null }[] = [];
      if (dto.name !== undefined && before.name !== after.name) {
        changedFields.push({ field: 'name', before: before.name, after: after.name });
      }
      if (dto.phone !== undefined && (before.phone ?? null) !== (after.phone ?? null)) {
        changedFields.push({ field: 'phone', before: before.phone, after: after.phone });
      }
      if (dto.point !== undefined && before.point !== after.point) {
        changedFields.push({
          field: 'point',
          before: String(before.point),
          after: String(after.point),
        });
      }
      if (dto.memo !== undefined && (before.memo ?? null) !== (after.memo ?? null)) {
        changedFields.push({ field: 'memo', before: before.memo, after: after.memo });
      }

      for (const c of changedFields) {
        await client.query(
          `INSERT INTO marigold.member_histories
             (member_id, field, before_val, after_val, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, c.field, c.before, c.after, adminId],
        );
      }

      await client.query('COMMIT');
      return after;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async softDelete(id: number) {
    const { rowCount } = await this.pool.query(
      `UPDATE marigold.members
          SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!rowCount) throw new NotFoundException('회원을 찾을 수 없습니다.');
    return { ok: true };
  }

  async getHistory(id: number) {
    await this.getById(id);
    const { rows } = await this.pool.query(
      `SELECT h.id, h.field, h.before_val, h.after_val, h.created_at,
              a.login_id AS changed_by
         FROM marigold.member_histories h
    LEFT JOIN marigold.admins a ON a.id = h.changed_by
        WHERE h.member_id = $1
        ORDER BY h.created_at DESC
        LIMIT 200`,
      [id],
    );
    return rows;
  }

  async listPayments(id: number) {
    await this.getById(id);
    const { rows } = await this.pool.query(
      `SELECT p.id, p.paid_at, p.total_amount, p.point_used, p.point_earned,
              p.final_amount, p.memo,
              COALESCE(json_agg(
                json_build_object(
                  'id', pi.id,
                  'item_name', pi.item_name,
                  'unit_price', pi.unit_price,
                  'quantity', pi.quantity,
                  'amount', pi.amount
                ) ORDER BY pi.id
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json) AS items,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', img.id, 'file_path', img.file_path
              )) FILTER (WHERE img.id IS NOT NULL), '[]'::json) AS images
         FROM marigold.payments p
    LEFT JOIN marigold.payment_items pi ON pi.payment_id = p.id
    LEFT JOIN marigold.payment_images img ON img.payment_id = p.id
        WHERE p.member_id = $1 AND p.deleted_at IS NULL
        GROUP BY p.id
        ORDER BY p.paid_at DESC, p.id DESC
        LIMIT 100`,
      [id],
    );
    return rows;
  }

  private normalizePhone(phone?: string | null): string | null {
    if (phone === undefined || phone === null) return null;
    const t = phone.replace(/[^0-9]/g, '');
    if (!t) return null;
    if (t === '0') return null;
    return t;
  }
}
