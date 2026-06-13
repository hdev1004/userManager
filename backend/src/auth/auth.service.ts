import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface AdminPayload {
  sub: number;
  loginId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwt: JwtService,
  ) {}

  async login(loginId: string, password: string) {
    const { rows } = await this.pool.query(
      `SELECT id, login_id, password, name, is_active
         FROM marigold.admins
        WHERE login_id = $1`,
      [loginId],
    );
    const admin = rows[0];
    if (!admin || !admin.is_active) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
    const ok = await this.safeCompare(password, admin.password);
    if (!ok) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
    const payload: AdminPayload = { sub: admin.id, loginId: admin.login_id };
    const token = await this.jwt.signAsync(payload);
    return {
      token,
      admin: {
        id: admin.id,
        loginId: admin.login_id,
        name: admin.name,
      },
    };
  }

  async changePassword(adminId: number, currentPassword: string, newPassword: string) {
    const { rows } = await this.pool.query(
      `SELECT password FROM marigold.admins WHERE id = $1`,
      [adminId],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException();
    }
    const ok = await this.safeCompare(currentPassword, rows[0].password);
    if (!ok) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.pool.query(
      `UPDATE marigold.admins SET password = $1 WHERE id = $2`,
      [hash, adminId],
    );
    return { ok: true };
  }

  private async safeCompare(plain: string, stored: string): Promise<boolean> {
    // Only bcrypt hashes are accepted. Legacy MySQL old_password hashes (start with '*')
    // cannot be verified — require an admin password reset.
    if (!stored || !stored.startsWith('$2')) return false;
    try {
      return await bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }
}
