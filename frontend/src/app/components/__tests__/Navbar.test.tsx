import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../Navbar';

// Mock Next.js modules
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

import { usePathname } from 'next/navigation';

describe('Navbar', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('should render the brand name', () => {
    render(<Navbar />);

    expect(screen.getByText('Agentic SEO')).toBeInTheDocument();
  });

  it('should render all navigation links', () => {
    render(<Navbar />);

    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('Library & Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Domains')).toBeInTheDocument();
  });

  it('should mark "Studio" as active when pathname is "/"', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    render(<Navbar />);

    const studioLink = screen.getByText('Studio').closest('a');
    expect(studioLink).toHaveClass('active');
  });

  it('should mark "Library & Dashboard" as active when pathname is "/dashboard"', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<Navbar />);

    const dashboardLink = screen.getByText('Library & Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('active');
  });

  it('should mark "Domains" as active when pathname is "/domains"', () => {
    (usePathname as jest.Mock).mockReturnValue('/domains');
    render(<Navbar />);

    const domainsLink = screen.getByText('Domains').closest('a');
    expect(domainsLink).toHaveClass('active');
  });

  it('should not mark non-active links as active', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<Navbar />);

    const studioLink = screen.getByText('Studio').closest('a');
    expect(studioLink).not.toHaveClass('active');

    const domainsLink = screen.getByText('Domains').closest('a');
    expect(domainsLink).not.toHaveClass('active');
  });

  it('should have correct href attributes', () => {
    render(<Navbar />);

    const studioLink = screen.getByText('Studio').closest('a');
    expect(studioLink).toHaveAttribute('href', '/');

    const dashboardLink = screen.getByText('Library & Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const domainsLink = screen.getByText('Domains').closest('a');
    expect(domainsLink).toHaveAttribute('href', '/domains');
  });

  it('should render the brand emoji', () => {
    render(<Navbar />);

    expect(screen.getByText('🚀')).toBeInTheDocument();
  });
});
