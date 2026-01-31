/**
 * Default prompt templates for AI summarisation
 */

/**
 * Default prompt template for log summarisation
 */
export const DEFAULT_PROMPT_TEMPLATE = `You are an expert DevOps engineer analyzing operational logs from a cloud application. Your goal is to provide actionable root cause analysis and guidance for developers.

Time Window: {timeWindow}

Log Data:
{logData}

Analyze the logs carefully, paying attention to:
- Error patterns and their sequence
- Contextual logs around errors (traces, dependencies, requests)
- Performance degradation patterns
- Timing relationships between events
- Correlation between different error types

Please provide a summary with the following structure:

1. **Title**: A brief title for this digest (e.g., "Daily Digest - Last 24h")

2. **Key Findings** (3-7 bullets): What changed or what matters most in this time window, focusing on patterns that indicate root causes

3. **Error Groups**: For each significant error pattern:
   - Description of the error (be specific about operation names and exception types)
   - Count of occurrences
   - First occurrence timestamp (ISO format) - this helps users search logs more effectively
   - **Root Cause Analysis**: Analyze the contextual logs, error messages, and timing to suggest the most likely root cause. Consider:
     * What was happening in the system around the time of first occurrence?
     * Are there patterns in the contextual logs (failed dependencies, slow requests, etc.)?
     * Could this be related to infrastructure, configuration, or code issues?
     * Are there correlations with other errors or performance issues?
   - **Investigation Guidance**: Specific things the developer should look for:
     * What log entries or metrics to search for
     * What time ranges to focus on
     * What related operations or dependencies to check
     * What configuration or code areas to review

4. **Performance Hotspots**: Operations with performance issues:
   - Operation name
   - Issue description
   - Severity (low/medium/high based on impact)
   - **Root Cause Analysis**: What might be causing the performance degradation (slow dependencies, resource constraints, inefficient code paths, etc.)
   - **Investigation Guidance**: What to check (database queries, external API calls, resource usage, etc.)

5. **Suggested Actions** (1-5 items): Concrete next steps prioritized by impact:
   - Immediate actions to mitigate issues
   - Investigation steps to confirm root causes
   - Long-term fixes or improvements

Keep the summary concise but thorough. Be specific about operation names, error types, timestamps, and what developers should investigate. Use the contextual log data provided to make informed root cause analysis.

**IMPORTANT: Keep responses concise. Root cause analysis and investigation guidance should be brief (1-2 sentences each). The total response should be under 3000 characters to fit in Slack messages. Prioritize the most critical errors and actionable insights.**

Format your response as JSON with this structure:
{
  "title": "...",
  "bullets": ["...", "..."],
  "errorGroups": [
    {
      "description": "...",
      "count": 123,
      "firstOccurrence": "2024-01-30T14:06:40.551Z",
      "rootCauseAnalysis": "Detailed analysis of likely root cause based on contextual logs and patterns",
      "investigationGuidance": "Specific things to look for: log entries, time ranges, related operations, code areas, etc.",
      "likelyCause": "Brief summary (for backward compatibility)"
    }
  ],
  "performanceHotspots": [
    {
      "operation": "...",
      "issue": "...",
      "severity": "low|medium|high",
      "rootCauseAnalysis": "Analysis of what might be causing performance issues",
      "investigationGuidance": "What to check: dependencies, resources, code paths, etc."
    }
  ],
  "suggestedActions": ["...", "..."]
}`;

import { safeDate } from '../utils/dates.js';

/**
 * Build prompt from template
 */
export function buildPrompt(
  template: string,
  timeWindow: { from: Date; to: Date },
  logData: string
): string {
  // Ensure dates are Date objects
  const fromDate = safeDate(timeWindow.from);
  const toDate = safeDate(timeWindow.to);
  
  return template
    .replace('{timeWindow}', `${fromDate.toISOString()} to ${toDate.toISOString()}`)
    .replace('{logData}', logData);
}
