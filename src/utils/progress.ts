/**
 * Simple progress indicator utilities for CLI
 */

export interface ProgressCallback {
  (message: string): void;
}

/**
 * Simple spinner for CLI
 */
export class Spinner {
  private interval: NodeJS.Timeout | null = null;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;
  private currentMessage = '';
  private isRunning = false;

  private clearLine(): void {
    // Use ANSI escape code to clear to end of line
    // \r = carriage return, \x1b[K = clear from cursor to end of line
    if (process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K');
    } else {
      // Fallback for non-TTY
      const cols = process.stdout.columns || 100;
      process.stdout.write('\r' + ' '.repeat(cols) + '\r');
    }
  }

  start(message: string = ''): void {
    this.currentMessage = message;
    this.isRunning = true;
    this.frameIndex = 0;
    
    // Write first frame without newline
    const output = this.frames[0] + ' ' + message;
    process.stdout.write('\r' + output);
    
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      const output = this.frames[this.frameIndex] + ' ' + this.currentMessage;
      // Use \r to return to start of line and overwrite
      process.stdout.write('\r' + output);
    }, 100);
  }

  update(message: string): void {
    this.currentMessage = message;
    if (this.isRunning) {
      const output = this.frames[this.frameIndex] + ' ' + message;
      process.stdout.write('\r' + output);
    }
  }

  stop(message?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    if (message !== undefined) {
      // Clear the line and write success message
      this.clearLine();
      process.stdout.write('✓ ' + message + '\n');
    } else {
      // Just clear the line
      this.clearLine();
    }
  }

  succeed(message: string): void {
    this.stop(message);
  }

  fail(message: string): void {
    this.stop('✗ ' + message);
  }
}

/**
 * Progress controller for CLI
 */
export interface CLIProgress {
  callback: ProgressCallback;
  finish: (message: string) => void;
}

/**
 * Create a progress callback for CLI usage
 */
export function createCLIProgress(): CLIProgress {
  const spinner = new Spinner();
  let currentStep = '';
  let isFinished = false;

  const callback: ProgressCallback = (message: string) => {
    if (isFinished) return;
    
    if (!currentStep) {
      // First message - just start spinner
      spinner.start(message);
      currentStep = message;
    } else if (message !== currentStep) {
      // New message - mark OLD step as complete (✓ + newline), then start new spinner
      spinner.succeed(currentStep);
      spinner.start(message);
      currentStep = message;
    }
    // If same message, the spinner is already animating - no action needed
  };

  const finish = (finalMessage: string) => {
    if (isFinished) return;
    isFinished = true;
    if (currentStep) {
      // Mark last step as complete
      spinner.succeed(currentStep);
    }
    process.stdout.write('✓ ' + finalMessage + '\n');
  };

  return { callback, finish };
}

/**
 * No-op progress callback for library usage
 */
export const noopProgress: ProgressCallback = () => {
  // Do nothing - library usage doesn't need progress indicators
};
