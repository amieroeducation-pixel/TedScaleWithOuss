import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getValidGoogleToken } from '@/lib/google/tokens'

describe('getValidGoogleToken', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('returns existing token if still valid', async () => {
    const userId = 'user-123'
    const tokenRow = {
      google_calendar_access_token: 'valid-token',
      google_calendar_refresh_token: 'refresh-token',
      google_calendar_token_expiry: Date.now() + 120_000, // 2 minutes in future
    }

    const result = await getValidGoogleToken(mockSupabase as any, userId, tokenRow)

    expect(result).toBe('valid-token')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null if no refresh token available', async () => {
    const userId = 'user-123'
    const tokenRow = {
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_token_expiry: null,
    }

    const result = await getValidGoogleToken(mockSupabase as any, userId, tokenRow)

    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refreshes token if expired', async () => {
    const userId = 'user-123'
    const tokenRow = {
      google_calendar_access_token: 'expired-token',
      google_calendar_refresh_token: 'refresh-token',
      google_calendar_token_expiry: Date.now() - 1000, // expired
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-token',
        expires_in: 3600,
      }),
    })
    global.fetch = mockFetch

    const result = await getValidGoogleToken(mockSupabase as any, userId, tokenRow)

    expect(result).toBe('new-token')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('returns null if refresh fails', async () => {
    const userId = 'user-123'
    const tokenRow = {
      google_calendar_access_token: 'expired-token',
      google_calendar_refresh_token: 'refresh-token',
      google_calendar_token_expiry: Date.now() - 1000,
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
    })
    global.fetch = mockFetch

    const result = await getValidGoogleToken(mockSupabase as any, userId, tokenRow)

    expect(result).toBeNull()
  })
})
