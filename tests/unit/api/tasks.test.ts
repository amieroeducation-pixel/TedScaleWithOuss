/**
 * Test unitaire pour /api/tasks
 *
 * Ce test vérifie:
 * - GET retourne les tasks de l'utilisateur connecté
 * - Filtres urgency et deadline fonctionnent
 * - Auth required
 * - Erreurs DB
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/tasks/route'
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

const mockTasks = [
  {
    id: '1',
    user_id: 'user-123',
    title: 'Task urgente aujourd\'hui',
    description: 'Test',
    priority: 1,
    col: 'todo',
    urgency: 'urgent',
    this_week: true,
    deadline: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user-123',
    title: 'Task normale demain',
    description: 'Test 2',
    priority: 2,
    col: 'todo',
    urgency: 'normal',
    this_week: true,
    deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'user-123',
    title: 'Task urgente sans deadline',
    description: 'Test 3',
    priority: 1,
    col: 'todo',
    urgency: 'urgent',
    this_week: false,
    deadline: null,
    created_at: new Date().toISOString(),
  },
]

describe('GET /api/tasks', () => {
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

    const request = new NextRequest('http://localhost:3000/api/tasks')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Unauthorized')
  })

  it('should filter by urgency=urgent', async () => {
    const mockChain: any = {
      eq: vi.fn().mockImplementation(function(this: any) { return mockChain }),
      order: vi.fn().mockResolvedValue({ data: [mockTasks[0], mockTasks[2]], error: null }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => mockChain),
      })),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks?urgency=urgent')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    // The route should have called eq for filtering
    expect(mockChain.eq).toHaveBeenCalled()
    expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('should filter by deadline=today', async () => {
    const today = new Date().toISOString().split('T')[0]
    const mockChain: any = {
      eq: vi.fn().mockImplementation(function(this: any) { return mockChain }),
      order: vi.fn().mockResolvedValue({ data: [mockTasks[0]], error: null }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => mockChain),
      })),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks?deadline=today')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    // The route should have called eq for filtering
    expect(mockChain.eq).toHaveBeenCalled()
    expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('should return correct JSON structure', async () => {
    const mockChain: any = {
      eq: vi.fn().mockImplementation(function(this: any) { return mockChain }),
      order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => mockChain),
      })),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toHaveProperty('success', true)
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data[0]).toHaveProperty('id')
    expect(json.data[0]).toHaveProperty('title')
    expect(json.data[0]).toHaveProperty('urgency')
  })

  it('should return 500 on database error', async () => {
    const mockChain: any = {
      eq: vi.fn().mockImplementation(function(this: any) { return mockChain }),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database connection failed' } }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => mockChain),
      })),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/tasks')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Database connection failed')
  })
})
