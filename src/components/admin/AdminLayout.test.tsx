import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as AuthContext from '../../context/AuthContext';

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

  it('renders admin content when user is admin', () => {
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

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.queryByText(/Not Authorized/i)).not.toBeInTheDocument();
  });
});
