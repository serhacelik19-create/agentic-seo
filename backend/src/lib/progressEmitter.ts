import { EventEmitter } from 'events';

export interface ProgressUpdate {
  keyword: string;
  step: number;
  totalSteps: number;
  percentage: number;
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agentName?: string;
  agentMessage?: string;
}

class ProgressEmitter extends EventEmitter {
  public emitProgress(update: ProgressUpdate) {
    this.emit('progress', update);
  }
}

export const progressEmitter = new ProgressEmitter();
