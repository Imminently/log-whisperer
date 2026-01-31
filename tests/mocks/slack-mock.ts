/**
 * Mock Slack notifier for testing
 */

import type { INotifier, NotificationMeta, NotifyResult, Summary } from '../../src/core/types.js';

export class MockSlackNotifier implements INotifier {
  name = 'slack';
  lastSentSummary: Summary | null = null;
  lastSentMeta: NotificationMeta | null = null;

  async send(summary: Summary, meta: NotificationMeta): Promise<NotifyResult> {
    this.lastSentSummary = summary;
    this.lastSentMeta = meta;
    return {
      success: true,
      messageId: 'mock-message-id',
    };
  }
}
