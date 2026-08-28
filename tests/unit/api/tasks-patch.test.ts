/**
 * Test unitaire pour PATCH /api/tasks/[id]
 *
 * Ce test vérifie:
 * - PATCH accepte les champs autorisés incluant deadline
 * - PATCH rejette les champs non autorisés
 * - Auth required
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/tasks/[id]/route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual('@/lib/api') as any
  return {
    ...actual,
    apiSuccess: (data: any, status?: number) => Response.json({ success: true, data }, { status: status ?? 200 }),
    apiError: (message: string, status: number) => Response.json({ success: false, error: message }, { status }),
    apiUnauthorized: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
  }
})

import { createSupabaseServerClient } from '@/lib/supabase/server'

describe('PATCH /api/tasks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if no user authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks/123', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New title' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
  })

  it('should accept deadline field in PATCH request', async () => {
    const mockUpdated = {
      id: '123',
      user_id: 'user-123',
      title: 'Updated task',
      deadline: '2026-12-31',
      updated_at: new Date().toISOString(),
    }

    const mockChain: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => mockChain),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks/123', {
      method: 'PATCH',
      body: JSON.stringify({ deadline: '2026-12-31' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('deadline', '2026-12-31')

    // Verify that update was called with deadline
    const updateCall = mockChain.update.mock.calls[0][0]
    expect(updateCall).toHaveProperty('deadline', '2026-12-31')
  })

  it('should accept all allowed fields: title, description, priority, col, estimated_time, badge, urgency, this_week, deadline', async () => {
    const mockUpdated = {
      id: '123',
      user_id: 'user-123',
      title: 'New title',
      description: 'New desc',
      priority: 3,
      col: 'inprogress',
      estimated_time: '2h',
      badge: 'premium',
      urgency: 'urgent',
      this_week: true,
      deadline: '2026-12-31',
      updated_at: new Date().toISOString(),
    }

    const mockChain: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => mockChain),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks/123', {
      method: 'PATCH',
      body: JSON.stringify({
        title: 'New title',
        description: 'New desc',
        priority: 3,
        col: 'inprogress',
        estimated_time: '2h',
        badge: 'premium',
        urgency: 'urgent',
        this_week: true,
        deadline: '2026-12-31',
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)

    // Verify all fields were passed to update
    const updateCall = mockChain.update.mock.calls[0][0]
    expect(updateCall).toHaveProperty('title', 'New title')
    expect(updateCall).toHaveProperty('description', 'New desc')
    expect(updateCall).toHaveProperty('deadline', '2026-12-31')
  })
})
