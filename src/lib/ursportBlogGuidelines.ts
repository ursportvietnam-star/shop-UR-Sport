export const URSPORT_BLOG_BRAND_GUIDELINES = `
URSPORT BLOG BRAND GUIDELINES

Audience:
- Men and women in Vietnam, mainly 18-45, who buy sportswear for gym, running, football, badminton, tennis/pickleball, travel, or daily casual wear.
- Include both beginners and regular recreational players. Explain terms simply before giving buying advice.
- Main needs: comfortable fit, breathable fabric, easy styling, reasonable price, durable use, and practical support for training or daily movement.

Voice and tone:
- Address the reader as "ban".
- Write like a knowledgeable sportswear advisor: practical, friendly, clear, and useful.
- Prefer real buying guidance over hard selling. Target 70% advice and 30% product/category suggestion.
- Avoid hype, absolute superiority, and vague luxury language.
- Open with the reader problem and answer the search intent quickly.
- Keep paragraphs short, use H2/H3 clearly, and include examples by use case.

Preferred words:
- phu hop, ben bi, thoai mai, thoang mat, co gian, tham hut, de phoi, tap luyen, thi dau, van dong, hieu nang, on dinh, linh hoat, trai nghiem su dung.

Avoid or use only with proof:
- tot nhat thi truong, so 1, cam ket 100% hieu qua, than thanh, dinh cao tuyet doi, sieu pham, giu form vinh vien, chong xu long hoan toan, ben gap 2-3 lan, khang khuan, anti-odor, chinh hang, bao hanh, cong nghe doc quyen.
`;

export const URSPORT_BLOG_PRODUCT_DATA_RULES = `
URSPORT PRODUCT DATA AND CLAIM RULES

Product data to use when available:
- Product/category names that really exist in URSport data.
- Material, fit, color, size range, price range, stock, policy, warranty, shipping, and return rules only when provided by the prompt, product data, or site context.
- For gym/sportswear articles, prioritize relevant categories such as ao thun the thao nam, ao gym nam, tank top, compression, quan the thao nam, quan short, and accessories only when the topic naturally needs them.

Claim rules:
- Do not invent material composition, technology, price, origin, warranty, stock status, medical benefit, injury-prevention result, or performance guarantee.
- Do not say "chinh hang", "bao hanh", "khang khuan", "anti-odor", "co gian 4 chieu", "cotton compact", "dry-fit", or similar product-specific claims unless the provided data confirms them.
- If product data is missing, write the product section as general buying advice and mark it as "can bo sung san pham thuc te tu URSport" in a natural admin-facing note or change summary, not as a customer-facing hard claim.
- If a source or number is needed but not available, say the detail needs verification instead of guessing.

Article structure:
- Start by answering the intent in 2-3 sentences.
- Explain selection criteria before suggesting URSport categories/products.
- Include practical checklist, common mistakes, FAQ, natural CTA, and internal links from the prompt.
- CTA should be soft: "Tham khao them...", "Xem cac mau phu hop...", "Lien he URSport neu ban can tu van size/form...".
`;

export const URSPORT_BLOG_FULL_GUIDELINES = [
  URSPORT_BLOG_BRAND_GUIDELINES.trim(),
  URSPORT_BLOG_PRODUCT_DATA_RULES.trim()
].join('\n\n');
