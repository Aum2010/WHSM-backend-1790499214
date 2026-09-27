import { Test } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { WHSMLogger } from '../../logger/logger.service'
import * as bcrypt from 'bcryptjs'

const mockUser = {
  id: 'user-1', cardId: 'WH-001', name: 'Test User',
  role: 'WAREHOUSE', passwordHash: '', isActive: true,
}

describe('AuthService', () => {
  let service: AuthService

  const mockPrisma = {
    user: { findUnique: jest.fn() },
  }
  const mockJwt   = { sign: jest.fn().mockReturnValue('mock-token') }
  const mockLogger = { userAction: jest.fn(), business: jest.fn() }

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10)
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt },
        { provide: WHSMLogger,    useValue: mockLogger },
      ],
    }).compile()
    service = module.get(AuthService)
  })

  it('should login with valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const result = await service.loginWithCard('WH-001', 'password123')
    expect(result.token).toBe('mock-token')
    expect(result.user.role).toBe('WAREHOUSE')
  })

  it('should throw UnauthorizedException for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    await expect(service.loginWithCard('WH-001', 'wrong')).rejects.toThrow(UnauthorizedException)
  })

  it('should throw UnauthorizedException for unknown card', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(service.loginWithCard('UNKNOWN', 'password123')).rejects.toThrow(UnauthorizedException)
  })
})
