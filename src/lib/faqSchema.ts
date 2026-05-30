export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Builds a Schema.org FAQPage object from a list of questions and answers.
 * This can be passed to buildSeoGraph() or used directly.
 */
export function buildFaqSchema(faqs: FAQItem[]) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}
