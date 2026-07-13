import { progressEmitter } from '../../../src/lib/progressEmitter';

/**
 * Tests for the ProgressEmitter singleton.
 * Verifies EventEmitter behavior for real-time SSE progress tracking.
 */
describe('progressEmitter', () => {
  afterEach(() => {
    progressEmitter.removeAllListeners();
  });

  it('should emit progress events to listeners via emitProgress()', () => {
    const listener = jest.fn();
    progressEmitter.on('progress', listener);

    const update = {
      keyword: 'test-keyword',
      step: 1,
      totalSteps: 3,
      percentage: 33,
      message: 'Processing...',
      status: 'processing' as const,
    };

    progressEmitter.emitProgress(update);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(update);
  });

  it('should support multiple listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    progressEmitter.on('progress', listener1);
    progressEmitter.on('progress', listener2);

    progressEmitter.emitProgress({
      keyword: 'multi',
      step: 1,
      totalSteps: 1,
      percentage: 100,
      message: 'Done',
      status: 'completed' as const,
    });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('should not notify removed listeners', () => {
    const listener = jest.fn();
    progressEmitter.on('progress', listener);
    progressEmitter.off('progress', listener);

    progressEmitter.emitProgress({
      keyword: 'removed',
      step: 1,
      totalSteps: 1,
      percentage: 100,
      message: 'Done',
      status: 'completed' as const,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should include optional agent fields in events', () => {
    const listener = jest.fn();
    progressEmitter.on('progress', listener);

    const update = {
      keyword: 'agent-test',
      step: 2,
      totalSteps: 5,
      percentage: 40,
      message: 'Researcher agent working...',
      status: 'processing' as const,
      agentName: 'Researcher',
      agentMessage: 'Analyzing content gaps',
    };

    progressEmitter.emitProgress(update);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'Researcher',
        agentMessage: 'Analyzing content gaps',
      })
    );
  });
});
