// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('verifyCronSecret', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns null when secret matches', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { verifyCronSecret } = await import('@/lib/cron/auth')
    const mockReq = { headers: { get: (name) => name === 'x-cron-secret' ? 'test-secret' : null } }
    expect(verifyCronSecret(mockReq)).toBeNull()
  })

  it('returns 401 when secret does not match', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { verifyCronSecret } = await import('@/lib/cron/auth')
    const mockReq = { headers: { get: (name) => name === 'x-cron-secret' ? 'wrong' : null } }
    const result = verifyCronSecret(mockReq)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(401)
  })

  it('returns null in development when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    process.env.NODE_ENV = 'development'
    const { verifyCronSecret } = await import('@/lib/cron/auth')
    const mockReq = { headers: { get: () => null } }
    expect(verifyCronSecret(mockReq)).toBeNull()
  })

  it('returns 500 in production when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    process.env.NODE_ENV = 'production'
    const { verifyCronSecret } = await import('@/lib/cron/auth')
    const mockReq = { headers: { get: () => null } }
    const result = verifyCronSecret(mockReq)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(500)
  })

  it('returns 401 when no header provided but secret is configured', async () => {
    process.env.CRON_SECRET = 'my-secret'
    const { verifyCronSecret } = await import('@/lib/cron/auth')
    const mockReq = { headers: { get: () => null } }
    const result = verifyCronSecret(mockReq)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(401)
  })
})
