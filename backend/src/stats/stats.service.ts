import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class StatsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ranking(limit = 50) {
    const { rows } = await this.pool.query(
      `SELECT id, name, phone, point, visit_count
         FROM marigold.members
        WHERE deleted_at IS NULL
        ORDER BY point DESC, visit_count DESC
        LIMIT $1`,
      [limit],
    );
    return rows;
  }

  async sales(from: string | undefined, to: string | undefined) {
    const { rows } = await this.pool.query(
      `SELECT date_trunc('day', paid_at)::date AS day,
              COUNT(*)::int                    AS count,
              SUM(total_amount)::int           AS total,
              SUM(final_amount)::int           AS final,
              SUM(point_used)::int             AS used,
              SUM(point_earned)::int           AS earned
         FROM marigold.payments
        WHERE deleted_at IS NULL
          AND ($1::timestamptz IS NULL OR paid_at >= $1)
          AND ($2::timestamptz IS NULL OR paid_at <  $2)
        GROUP BY day
        ORDER BY day`,
      [from ?? null, to ?? null],
    );
    return rows;
  }

  async categories(from?: string, to?: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id, c.name, c.code,
              COALESCE(SUM(pi.amount), 0)::int AS total,
              COUNT(pi.id)::int                AS count
         FROM marigold.item_categories c
    LEFT JOIN marigold.items     i  ON i.category_id = c.id
    LEFT JOIN marigold.payment_items pi ON pi.item_id = i.id
    LEFT JOIN marigold.payments  p  ON p.id = pi.payment_id
                                   AND p.deleted_at IS NULL
                                   AND ($1::timestamptz IS NULL OR p.paid_at >= $1)
                                   AND ($2::timestamptz IS NULL OR p.paid_at <  $2)
        WHERE c.deleted_at IS NULL
        GROUP BY c.id
        ORDER BY total DESC`,
      [from ?? null, to ?? null],
    );
    return rows;
  }

  async topItems(limit = 10, from?: string, to?: string) {
    const { rows } = await this.pool.query(
      `SELECT pi.item_name,
              COUNT(*)::int       AS count,
              SUM(pi.quantity)::int AS quantity,
              SUM(pi.amount)::int   AS total
         FROM marigold.payment_items pi
         JOIN marigold.payments      p ON p.id = pi.payment_id
        WHERE p.deleted_at IS NULL
          AND ($2::timestamptz IS NULL OR p.paid_at >= $2)
          AND ($3::timestamptz IS NULL OR p.paid_at <  $3)
        GROUP BY pi.item_name
        ORDER BY total DESC
        LIMIT $1`,
      [limit, from ?? null, to ?? null],
    );
    return rows;
  }

  async summary() {
    const [totals, today] = await Promise.all([
      this.pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM marigold.members  WHERE deleted_at IS NULL) AS members,
           (SELECT COUNT(*)::int FROM marigold.payments WHERE deleted_at IS NULL) AS payments,
           (SELECT COALESCE(SUM(final_amount),0)::int FROM marigold.payments WHERE deleted_at IS NULL) AS total`,
      ),
      this.pool.query(
        `SELECT
           COUNT(*)::int                          AS count,
           COALESCE(SUM(final_amount),0)::int     AS total
         FROM marigold.payments
        WHERE deleted_at IS NULL
          AND paid_at >= date_trunc('day', NOW())`,
      ),
    ]);
    return { totals: totals.rows[0], today: today.rows[0] };
  }
}
