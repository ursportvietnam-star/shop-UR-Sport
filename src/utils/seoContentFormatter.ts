export const textFromHtml = (html = ''): string => 
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeSeoText = (value = ''): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

export const isFaqHeadingText = (value = ''): boolean => {
  const text = normalizeSeoText(value);
  return text.includes('cau hoi thuong gap') || text === 'faq' || text.includes('faq');
};

export const extractPlainFaqs = (root: ParentNode) => {
  const faqs: { question: string; answer: string; answerHtml: string }[] = [];
  const heading = Array.from(root.querySelectorAll('h2, h3')).find(item => isFaqHeadingText(item.textContent || ''));
  if (!heading) return faqs;

  let node = heading.nextElementSibling;
  while (node) {
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'h2') break;

    if (/^h[3-4]$/.test(tagName)) {
      const question = textFromHtml(node.innerHTML);
      const answerNodes: Element[] = [];
      let answerNode = node.nextElementSibling;

      while (answerNode) {
        const answerTag = answerNode.tagName.toLowerCase();
        if (answerTag === 'h2' || /^h[3-4]$/.test(answerTag) || answerNode.matches('.faq, details.seo-faq')) break;
        answerNodes.push(answerNode);
        answerNode = answerNode.nextElementSibling;
      }

      const answerHtml = answerNodes.map(item => item.outerHTML).join('').trim();
      const answer = textFromHtml(answerHtml);
      if (question && answer) {
        faqs.push({ question, answer, answerHtml });
      }

      node = answerNode;
      continue;
    }

    node = node.nextElementSibling;
  }

  return faqs;
};

export const parseSeoFaqs = (html: string): { question: string; answer: string }[] => {
  if (typeof window === 'undefined' || !html) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const faqBlocks = Array.from(doc.querySelectorAll('.faq, details.seo-faq'));

  const faqBlocksResult = faqBlocks
    .map((block) => {
      const questionNode = block.matches('details')
        ? block.querySelector('summary')
        : block.querySelector('.question');
      const answerNode = block.querySelector('.answer, .seo-faq-answer');

      const question = textFromHtml(questionNode?.innerHTML || '');
      const answer = textFromHtml(answerNode?.innerHTML || '');

      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is { question: string; answer: string } => Boolean(item));

  const plainFaqs = extractPlainFaqs(doc.body).map(({ question, answer }) => ({ question, answer }));
  const seen = new Set(faqBlocksResult.map(item => normalizeSeoText(item.question)));

  return [
    ...faqBlocksResult,
    ...plainFaqs.filter(item => {
      const key = normalizeSeoText(item.question);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  ];
};

export const formatSeoContentHtml = (html: string): string => {
  if (typeof window === 'undefined' || !html) {
    return html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
  }

  const doc = new DOMParser().parseFromString(html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' '), 'text/html');

  doc.querySelectorAll('.faq').forEach((faqBlock) => {
    const questionNode = faqBlock.querySelector('.question');
    const answerNode = faqBlock.querySelector('.answer');
    if (!questionNode || !answerNode) return;

    questionNode.querySelectorAll('i, svg').forEach(icon => icon.remove());

    const details = doc.createElement('details');
    details.className = 'seo-faq';

    const summary = doc.createElement('summary');
    summary.className = 'seo-faq-question';
    summary.innerHTML = `<span>${questionNode.innerHTML.trim()}</span><span class="seo-faq-icon" aria-hidden="true"></span>`;

    const answer = doc.createElement('div');
    answer.className = 'seo-faq-answer';
    answer.innerHTML = answerNode.innerHTML.trim();

    details.append(summary, answer);
    faqBlock.replaceWith(details);
  });

  const faqHeading = Array.from(doc.body.querySelectorAll('h2, h3')).find(item => isFaqHeadingText(item.textContent || ''));
  if (faqHeading && !faqHeading.parentElement?.classList.contains('seo-faq-section')) {
    const faqSection = doc.createElement('section');
    faqSection.className = 'seo-faq-section';

    const title = doc.createElement('h2');
    title.className = 'seo-faq-title';
    title.innerHTML = faqHeading.innerHTML.trim();
    faqSection.appendChild(title);

    let node = faqHeading.nextElementSibling;
    let faqIndex = 0;
    const nodesToRemove: Element[] = [faqHeading];

    while (node) {
      const tagName = node.tagName.toLowerCase();
      if (tagName === 'h2') break;

      if (node.matches('details.seo-faq')) {
        const next = node.nextElementSibling;
        if (faqIndex === 0) (node as HTMLDetailsElement).open = true;
        faqSection.appendChild(node);
        faqIndex += 1;
        node = next;
        continue;
      }

      if (/^h[3-4]$/.test(tagName)) {
        const questionHtml = node.innerHTML.trim();
        const answerNodes: Element[] = [];
        let answerNode = node.nextElementSibling;

        while (answerNode) {
          const answerTag = answerNode.tagName.toLowerCase();
          if (answerTag === 'h2' || /^h[3-4]$/.test(answerTag) || answerNode.matches('details.seo-faq')) break;
          answerNodes.push(answerNode);
          answerNode = answerNode.nextElementSibling;
        }

        if (questionHtml && answerNodes.length) {
          const details = doc.createElement('details');
          details.className = 'seo-faq';

          const summary = doc.createElement('summary');
          summary.className = 'seo-faq-question';
          summary.innerHTML = `<span>${questionHtml}</span><span class="seo-faq-icon" aria-hidden="true"></span>`;

          const answer = doc.createElement('div');
          answer.className = 'seo-faq-answer';
          answer.innerHTML = answerNodes.map(item => item.outerHTML).join('');

          details.append(summary, answer);
          faqSection.appendChild(details);
          nodesToRemove.push(node, ...answerNodes);
          faqIndex += 1;
        }

        node = answerNode;
        continue;
      }

      const next = node.nextElementSibling;
      nodesToRemove.push(node);
      node = next;
    }

    if (faqIndex > 0) {
      faqHeading.replaceWith(faqSection);
      nodesToRemove.slice(1).forEach(item => item.remove());
    }
  }

  return doc.body.innerHTML;
};
