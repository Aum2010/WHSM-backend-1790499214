import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger } from '../../logger/logger.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private logger: WHSMLogger,
  ) {}

  async loginWithCard(cardId: string, password: string) {
    this.logger.userAction('SCAN_EMPLOYEE_CARD', { cardId })
    const user = await this.prisma.user.findUnique({
      where: { cardId, isActive: true },
    })
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('บัตรพนักงานหรือรหัสผ่านไม่ถูกต้อง')

    this.logger.business('LOGIN_SUCCESS', `User ${user.name} logged in`, { userId: user.id, role: user.role })
    const token = this.jwt.sign({ sub: user.id, role: user.role, name: user.name })
    return { token, user: { id: user.id, name: user.name, role: user.role } }
  }

  async validateToken(payload: { sub: string }) {
    return this.prisma.user.findUnique({ where: { id: payload.sub, isActive: true } })
  }
}
