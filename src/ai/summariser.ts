/**
 * AI summariser implementation
 */

import type { IAISummariser, LogSignalBundle, LogWhispererConfig, Summary } from '../core/types.js';
import { createOpenAIClient, summarizeWithOpenAI } from './openai-client.js';
import { buildPrompt, DEFAULT_PROMPT_TEMPLATE } from './prompts.js';
import { formatBundleForAI } from '../utils/truncation.js';
import { redactSecretsFromObject } from '../utils/redaction.js';

export class AISummariser implements IAISummariser {
  async summarise(bundle: LogSignalBundle, config: LogWhispererConfig): Promise<Summary> {
    // Redact secrets before sending to AI (preserves Date objects)
    const redactedBundle = redactSecretsFromObject(bundle) as LogSignalBundle;

    // Format bundle for AI input
    const logData = formatBundleForAI(redactedBundle);

    // Build prompt - ensure timeWindow dates are Date objects
    const promptTemplate = config.ai.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
    // Use original bundle timeWindow (not redacted) to ensure dates are preserved
    const timeWindow = {
      from: bundle.timeWindow.from instanceof Date 
        ? bundle.timeWindow.from 
        : new Date(bundle.timeWindow.from),
      to: bundle.timeWindow.to instanceof Date 
        ? bundle.timeWindow.to 
        : new Date(bundle.timeWindow.to),
    };
    const prompt = buildPrompt(promptTemplate, timeWindow, logData);

    // Call OpenAI
    const client = createOpenAIClient(config);
    const result = await summarizeWithOpenAI(client, prompt, config);

    // Parse JSON response
    let parsed: Partial<Summary>;
    try {
      parsed = JSON.parse(result.content);
    } catch (error) {
      // Log the actual response to help debug truncation issues
      const contentPreview = result.content.substring(0, 500);
      const contentLength = result.content.length;
      throw new Error(
        `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : String(error)}. ` +
        `Response length: ${contentLength} chars. Preview: ${contentPreview}${contentLength > 500 ? '...' : ''}`
      );
    }

    // Validate and construct summary
    const summary: Summary = {
      title: parsed.title || 'Log Summary',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
      errorGroups: Array.isArray(parsed.errorGroups)
        ? parsed.errorGroups.map((eg: any) => ({
            description: String(eg.description || ''),
            count: Number(eg.count || 0),
            firstOccurrence: eg.firstOccurrence ? String(eg.firstOccurrence) : undefined,
            rootCauseAnalysis: eg.rootCauseAnalysis ? String(eg.rootCauseAnalysis) : undefined,
            investigationGuidance: eg.investigationGuidance ? String(eg.investigationGuidance) : undefined,
            likelyCause: eg.likelyCause ? String(eg.likelyCause) : undefined,
          }))
        : [],
      performanceHotspots: Array.isArray(parsed.performanceHotspots)
        ? parsed.performanceHotspots.map((ph: any) => ({
            operation: String(ph.operation || ''),
            issue: String(ph.issue || ''),
            severity: ['low', 'medium', 'high'].includes(ph.severity) ? ph.severity : 'medium',
            rootCauseAnalysis: ph.rootCauseAnalysis ? String(ph.rootCauseAnalysis) : undefined,
            investigationGuidance: ph.investigationGuidance ? String(ph.investigationGuidance) : undefined,
          }))
        : [],
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
      metadata: {
        tokensUsed: result.tokensUsed,
        model: result.model,
      },
    };

    return summary;
  }
}
