import {
  productAdvisorInput,
  productAdvisorInstructions
} from '../prompts/product-advisor.prompt.js';

function outputText(payload) {
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text') return content.text;
    }
  }

  return undefined;
}

export function createAiProvider({
  provider = process.env.AI_PROVIDER || 'fallback',
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL,
  baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  request = fetch,
  timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 8000)
} = {}) {
  const configured = provider.toLowerCase() === 'openai' &&
    Boolean(apiKey) && Boolean(model);
  const root = baseUrl.replace(/\/$/, '');

  async function chooseProducts({intent, candidates, requestId}) {
    if (!configured) return null;

    const response = await request(`${root}/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'x-client-request-id': requestId
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: productAdvisorInstructions,
        input: productAdvisorInput({intent, candidates}),
        max_output_tokens: 200,
        text: {
          format: {
            type: 'json_schema',
            name: 'product_recommendation',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                productIds: {
                  type: 'array',
                  maxItems: 3,
                  items: {type: 'string'}
                }
              },
              required: ['productIds'],
              additionalProperties: false
            }
          }
        }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const payload = await response.json();
    const text = outputText(payload);
    const parsed = JSON.parse(text || '{}');

    if (!Array.isArray(parsed.productIds)) {
      throw new Error('AI provider returned an invalid response');
    }

    return parsed.productIds.slice(0, 3);
  }

  return {configured, chooseProducts};
}
