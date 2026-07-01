import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CompareDrawer } from './CompareDrawer';

const series = {
  name: 'Legend',
  slug: 'legend',
  basePrice: 40000,
  subSeries: [
    {
      id: 'legend-elite', slug: 'legend-elite', name: 'Legend Elite', grade: 'Grade 1', basePrice: 40000, active: true,
      attributes: [
        { key: 'willow-grade', label: 'Willow Grade', mode: 'fixed', active: true, sortOrder: 0, fixedValue: 'Grade 1 English Willow' },
        { key: 'sweet-spot', label: 'Sweet Spot', mode: 'fixed', active: true, sortOrder: 1, fixedValue: 'Mid' },
      ],
    },
    {
      id: 'legend-pro', slug: 'legend-pro', name: 'Legend Pro', grade: 'Grade 2', basePrice: 32000, active: true,
      attributes: [
        { key: 'willow-grade', label: 'Willow Grade', mode: 'fixed', active: true, sortOrder: 0, fixedValue: 'Grade 2 English Willow' },
      ],
    },
  ],
};

const renderDrawer = (props: any = {}) =>
  render(
    <MemoryRouter>
      <CompareDrawer open series={series} activeSubId="legend-elite" onClose={vi.fn()} onViewSpecSheet={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe('CompareDrawer', () => {
  it('lists every sub-series with price + key attributes', () => {
    renderDrawer();
    expect(screen.getByText('Legend Elite')).toBeInTheDocument();
    expect(screen.getByText('Legend Pro')).toBeInTheDocument();
    expect(screen.getByText('₹40,000')).toBeInTheDocument();
    expect(screen.getByText('₹32,000')).toBeInTheDocument();
    expect(screen.getAllByText('Willow Grade').length).toBeGreaterThan(0);
  });

  it('marks the active sub as viewing with a spec-sheet action, others get "View this bat"', () => {
    renderDrawer();
    expect(screen.getByText('Viewing')).toBeInTheDocument();
    expect(screen.getByText(/See full spec sheet/i)).toBeInTheDocument();
    const view = screen.getByText(/View this bat/i).closest('a');
    expect(view).toHaveAttribute('href', '/collection/legend/legend-pro');
  });

  it('renders nothing when closed', () => {
    const { container } = renderDrawer({ open: false });
    expect(container).toBeEmptyDOMElement();
  });
});
