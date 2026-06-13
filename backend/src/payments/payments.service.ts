import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, isAbsolute } from 'path';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { PG_POOL } from '../database/database.module';
import {
  CreatePaymentDto,
  PaymentItemDto,
  UpdatePaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePaymentDto, adminId: number) {
    if (!dto.items.length) {
      throw new BadRequestException('결제 항목이 비어 있습니다.');
    }

    const totals = this.computeTotals(dto.items, dto.point_used ?? 0);
    const method = dto.payment_method ?? 'CASH';

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const member = await client.query(
        `SELECT id, point FROM marigold.members
          WHERE id = $1 AND deleted_at IS NULL
          FOR UPDATE`,
        [dto.member_id],
      );
      if (member.rows.length === 0) {
        throw new NotFoundException('회원을 찾을 수 없습니다.');
      }
      const currentPoint = member.rows[0].point as number;
      // 카드 결제는 포인트 사용/적립 모두 금지
      const used = method === 'CARD' ? 0 : (dto.point_used ?? 0);
      const earned = method === 'CARD' ? 0 : (dto.point_earned ?? 0);

      if (used > currentPoint) {
        throw new BadRequestException(
          `사용 가능 포인트(${currentPoint})를 초과했습니다.`,
        );
      }

      const payRes = await client.query(
        `INSERT INTO marigold.payments
           (member_id, total_amount, point_used, point_earned,
            final_amount, payment_method, memo, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, paid_at, total_amount, point_used,
                   point_earned, final_amount, payment_method, memo, created_at`,
        [
          dto.member_id,
          totals.total,
          used,
          earned,
          totals.final,
          method,
          dto.memo ?? null,
          adminId,
        ],
      );
      const payment = payRes.rows[0];

      await this.insertItems(client, payment.id, dto.items);

      await client.query(
        `UPDATE marigold.members
            SET point       = point - $2 + $3,
                visit_count = visit_count + 1
          WHERE id = $1`,
        [dto.member_id, used, earned],
      );

      await client.query('COMMIT');
      return this.getById(payment.id);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async update(id: number, dto: UpdatePaymentDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const cur = await client.query(
        `SELECT id, member_id, total_amount, point_used, point_earned, payment_method
           FROM marigold.payments
          WHERE id = $1 AND deleted_at IS NULL
          FOR UPDATE`,
        [id],
      );
      if (cur.rows.length === 0) {
        throw new NotFoundException('결제를 찾을 수 없습니다.');
      }
      const before = cur.rows[0];

      const method = (dto.payment_method ?? before.payment_method) as
        | 'CASH'
        | 'CARD';

      const totals = {
        total: before.total_amount as number,
        used: before.point_used as number,
        earned: before.point_earned as number,
      };

      if (dto.items) {
        const c = this.computeTotals(dto.items, dto.point_used ?? before.point_used);
        totals.total = c.total;
        await client.query(
          `DELETE FROM marigold.payment_items WHERE payment_id = $1`,
          [id],
        );
        await this.insertItems(client, id, dto.items);
      }
      if (dto.point_used !== undefined) totals.used = dto.point_used;
      if (dto.point_earned !== undefined) totals.earned = dto.point_earned;
      // 카드 결제일 때는 사용/적립 모두 0 강제
      if (method === 'CARD') {
        totals.used = 0;
        totals.earned = 0;
      }
      const finalAmt = Math.max(0, totals.total - totals.used);

      await client.query(
        `UPDATE marigold.payments SET
            total_amount   = $2,
            point_used     = $3,
            point_earned   = $4,
            final_amount   = $5,
            payment_method = $6,
            memo           = COALESCE($7, memo)
          WHERE id = $1`,
        [
          id,
          totals.total,
          totals.used,
          totals.earned,
          finalAmt,
          method,
          dto.memo ?? null,
        ],
      );

      const usedDelta   = totals.used   - before.point_used;
      const earnedDelta = totals.earned - before.point_earned;
      if (usedDelta !== 0 || earnedDelta !== 0) {
        await client.query(
          `UPDATE marigold.members
              SET point = point - $2 + $3
            WHERE id = $1`,
          [before.member_id, usedDelta, earnedDelta],
        );
      }

      await client.query('COMMIT');
      return this.getById(id);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async getById(id: number) {
    const { rows } = await this.pool.query(
      `SELECT p.id, p.member_id, p.paid_at, p.total_amount, p.point_used,
              p.point_earned, p.final_amount, p.payment_method, p.memo,
              m.name AS member_name, m.phone AS member_phone,
              COALESCE(json_agg(
                json_build_object(
                  'id', pi.id,
                  'item_id', pi.item_id,
                  'item_name', pi.item_name,
                  'unit_price', pi.unit_price,
                  'quantity', pi.quantity,
                  'amount', pi.amount
                ) ORDER BY pi.id
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json) AS items,
              COALESCE((
                SELECT json_agg(
                  json_build_object('id', i.id, 'file_path', i.file_path)
                  ORDER BY i.id
                )
                  FROM marigold.payment_images i
                 WHERE i.payment_id = p.id
              ), '[]'::json) AS images
         FROM marigold.payments p
         JOIN marigold.members  m ON m.id = p.member_id
    LEFT JOIN marigold.payment_items pi ON pi.payment_id = p.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
        GROUP BY p.id, m.name, m.phone`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('결제를 찾을 수 없습니다.');
    return rows[0];
  }

  async addImage(
    paymentId: number,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
  ) {
    const pay = await this.pool.query(
      `SELECT id FROM marigold.payments WHERE id = $1 AND deleted_at IS NULL`,
      [paymentId],
    );
    if (pay.rows.length === 0) {
      throw new NotFoundException('결제를 찾을 수 없습니다.');
    }
    const root = this.uploadRoot();
    const dir = join(root, 'payments', String(paymentId));
    await fs.mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    const abs = join(dir, safeName);
    await fs.writeFile(abs, file.buffer);
    const rel = `payments/${paymentId}/${safeName}`;
    const { rows } = await this.pool.query(
      `INSERT INTO marigold.payment_images
         (payment_id, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, file_path, file_size, mime_type`,
      [paymentId, rel, file.size, file.mimetype],
    );
    return rows[0];
  }

  async removeImage(paymentId: number, imageId: number) {
    const { rows } = await this.pool.query(
      `SELECT file_path FROM marigold.payment_images
        WHERE id = $1 AND payment_id = $2`,
      [imageId, paymentId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('이미지를 찾을 수 없습니다.');
    }
    await this.pool.query(`DELETE FROM marigold.payment_images WHERE id = $1`, [imageId]);
    const abs = join(this.uploadRoot(), rows[0].file_path);
    await fs.unlink(abs).catch(() => undefined);
    return { ok: true };
  }

  private async insertItems(client: any, paymentId: number, items: PaymentItemDto[]) {
    for (const it of items) {
      const amount = it.unit_price * it.quantity;
      await client.query(
        `INSERT INTO marigold.payment_items
           (payment_id, item_id, item_name, unit_price, quantity, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          paymentId,
          it.item_id ?? null,
          it.item_name,
          it.unit_price,
          it.quantity,
          amount,
        ],
      );
    }
  }

  private computeTotals(items: PaymentItemDto[], pointUsed: number) {
    const total = items.reduce((s, x) => s + x.unit_price * x.quantity, 0);
    const final = Math.max(0, total - (pointUsed || 0));
    return { total, final };
  }

  private uploadRoot(): string {
    const raw = this.config.get<string>('UPLOAD_ROOT') ?? './uploads';
    return isAbsolute(raw) ? raw : join(process.cwd(), '..', raw);
  }
}
