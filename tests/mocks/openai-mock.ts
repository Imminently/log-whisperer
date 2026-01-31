/**
 * Mock OpenAI client for testing
 */

export class MockOpenAIClient {
  async chat() {
    return {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Test Summary',
                  bullets: ['Test bullet 1', 'Test bullet 2'],
                  errorGroups: [
                    {
                      description: 'Test error',
                      count: 10,
                      likelyCause: 'Test cause',
                    },
                  ],
                  performanceHotspots: [
                    {
                      operation: 'TestOp',
                      issue: 'Slow',
                      severity: 'high',
                    },
                  ],
                  suggestedActions: ['Action 1', 'Action 2'],
                }),
              },
            },
          ],
          usage: {
            total_tokens: 100,
          },
        }),
      },
    };
  }
}
