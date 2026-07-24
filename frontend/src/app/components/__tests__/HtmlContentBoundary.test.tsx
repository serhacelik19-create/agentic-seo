import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HtmlContentBoundary } from '../HtmlContentBoundary';

describe('HtmlContentBoundary', () => {
  it('should render an empty div during SSR (before mount)', () => {
    const { container } = render(
      <HtmlContentBoundary content="<p>Hello</p>" className="test-class" />
    );

    // After first render, useEffect sets mounted=true, triggering innerHTML
    // But we can check that the container exists with the right class
    const wrapper = container.querySelector('.test-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('should render HTML content after mounting', async () => {
    const { container } = render(
      <HtmlContentBoundary content="<p>Hello World</p>" className="content" />
    );

    // Wait for useEffect to fire
    await act(async () => {});

    const wrapper = container.querySelector('.content');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper!.innerHTML).toBe('<p>Hello World</p>');
  });

  it('should update innerHTML when content prop changes', async () => {
    const { container, rerender } = render(
      <HtmlContentBoundary content="<p>First</p>" className="dynamic" />
    );

    await act(async () => {});

    const wrapper = container.querySelector('.dynamic');
    expect(wrapper!.innerHTML).toBe('<p>First</p>');

    rerender(<HtmlContentBoundary content="<p>Second</p>" className="dynamic" />);
    await act(async () => {});

    expect(wrapper!.innerHTML).toBe('<p>Second</p>');
  });

  it('should highlight keyword when highlightKeyword prop is provided', async () => {
    const { container } = render(
      <HtmlContentBoundary
        content="<p>Learn about SEO optimization techniques.</p>"
        highlightKeyword="SEO"
        className="highlight"
      />
    );

    await act(async () => {});

    const wrapper = container.querySelector('.highlight');
    expect(wrapper!.innerHTML).toContain('<mark');
    expect(wrapper!.innerHTML).toContain('SEO');
  });

  it('should not highlight when highlightKeyword is null', async () => {
    const { container } = render(
      <HtmlContentBoundary
        content="<p>No highlighting here.</p>"
        highlightKeyword={null}
        className="no-highlight"
      />
    );

    await act(async () => {});

    const wrapper = container.querySelector('.no-highlight');
    expect(wrapper!.innerHTML).not.toContain('<mark');
  });

  it('should handle empty content gracefully', async () => {
    const { container } = render(
      <HtmlContentBoundary content="" className="empty" />
    );

    await act(async () => {});

    const wrapper = container.querySelector('.empty');
    expect(wrapper!.innerHTML).toBe('');
  });

  it('should apply custom style prop', () => {
    const { container } = render(
      <HtmlContentBoundary
        content="<p>Styled</p>"
        style={{ color: 'red', fontSize: '16px' }}
        className="styled"
      />
    );

    const wrapper = container.querySelector('.styled');
    expect(wrapper).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('should sanitize dangerous script content', async () => {
    const { container } = render(
      <HtmlContentBoundary
        content='<p>Safe</p><script>alert("xss")</script>'
        className="xss"
      />
    );

    await act(async () => {});

    const wrapper = container.querySelector('.xss');
    expect(wrapper!.innerHTML).not.toContain('<script>');
    expect(wrapper!.innerHTML).toContain('<p>Safe</p>');
  });
});
