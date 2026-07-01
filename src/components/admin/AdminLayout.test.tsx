import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as AuthContext from '../../context/AuthContext';

// Stub supabase so the admin MFA gate + data hooks resolve deterministically.
vi.mock('../../lib/supabase', () => {
  const result = { data: [], error: null, count: 0 };
  const chain: any = {
    select: () => chain, eq: () => chain, order: () => chain,
    limit: () => Promise.resolve(result), single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (res: any) => res(result),
  };
  return {
    supabase: {
      from: () => chain,
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}), unsubscribe: () => {} }),
      removeChannel: () => {},
      auth: {
        mfa: {
          getAuthenticatorAssuranceLevel: () => Promise.resolve({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null }),
          listFactors: () => Promise.resolve({ data: { totp: [] }, error: null }),
        },
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
    },
  };
});

describe('AdminLayout gating', () => {
  it('redirects to login when user is not authenticated', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null as any,
      profile: null as any,
      isAdmin: false,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />} />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('shows not authorized fallback when user is authenticated but not admin', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { uid: 'user-1' } as any,
      profile: { role: 'customer', email: 'x', fullName: 'x', phone: 'x', profileCompleted: true } as any,
      isAdmin: false,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Not Authorized/i)).toBeInTheDocument();
  });

  it('renders admin content when user is admin (aal2 session)', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { uid: 'admin-1' } as any,
      profile: { role: 'admin', email: 'x', fullName: 'x', phone: 'x', profileCompleted: true } as any,
      isAdmin: true,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<div data-testid="admin-content">Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // The MFA gate resolves asynchronously (aal2 → ok) before content renders.
    expect(await screen.findByTestId('admin-content')).toBeInTheDocument();
    expect(screen.queryByText(/Not Authorized/i)).not.toBeInTheDocument();
  });
});
