const textFromHtml = (html = '') => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const normalizeFaqText = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/\s+/g, ' ')
  .trim();

export const isFaqHeadingText = (value = '') => {
  const text = normalizeFaqText(value);
  return text.includes('cau hoi thuong gap') || text === 'faq' || text.includes('faq');
};

export const formatFaqContentHtml = (html: string) => {
  const normalizedHtml = html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
  if (typeof window === 'undefined' || !normalizedHtml) return normalizedHtml;

  const doc = new DOMParser().parseFromString(normalizedHtml, 'text/html');

  doc.querySelectorAll('.faq').forEach((faqBlock, index) => {
    const questionNode = faqBlock.querySelector('.question');
    const answerNode = faqBlock.querySelector('.answer');
    if (!questionNode || !answerNode) return;

    questionNode.querySelectorAll('i, svg').forEach(icon => icon.remove());

    const details = doc.createElement('details');
    details.className = 'seo-faq';
    if (index === 0) details.open = true;

    const summary = doc.createElement('summary');
    summary.className = 'seo-faq-question';
    summary.innerHTML = `<span>${questionNode.innerHTML.trim()}</span><span class="seo-faq-icon" aria-hidden="true"></span>`;

    const answer = doc.createElement('div');
    answer.className = 'seo-faq-answer';
    answer.innerHTML = answerNode.innerHTML.trim();

    details.append(summary, answer);
    faqBlock.replaceWith(details);
  });

  Array.from(doc.body.querySelectorAll('h2, h3')).forEach((heading) => {
    if (!isFaqHeadingText(heading.textContent || '') || heading.closest('.seo-faq-section')) return;

    const faqSection = doc.createElement('section');
    faqSection.className = 'seo-faq-section';

    const title = doc.createElement('h2');
    title.className = 'seo-faq-title';
    title.innerHTML = heading.innerHTML.trim();

    heading.replaceWith(faqSection);
    faqSection.appendChild(title);

    let faqIndex = 0;
    let node = faqSection.nextElementSibling;

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

        const answerHtml = answerNodes.map(item => item.outerHTML).join('').trim();
        if (questionHtml && textFromHtml(answerHtml)) {
          const details = doc.createElement('details');
          details.className = 'seo-faq';
          if (faqIndex === 0) details.open = true;

          const summary = doc.createElement('summary');
          summary.className = 'seo-faq-question';
          summary.innerHTML = `<span>${questionHtml}</span><span class="seo-faq-icon" aria-hidden="true"></span>`;

          const answer = doc.createElement('div');
          answer.className = 'seo-faq-answer';
          answer.innerHTML = answerHtml;

          details.append(summary, answer);
          faqSection.appendChild(details);
          node.remove();
          answerNodes.forEach(item => item.remove());
          faqIndex += 1;
        }

        node = answerNode;
        continue;
      }

      const next = node.nextElementSibling;
      if (faqIndex === 0) {
        faqSection.appendChild(node);
      }
      node = next;
    }

    if (faqIndex === 0) {
      faqSection.replaceWith(heading);
    }
  });

  return doc.body.innerHTML;
};
