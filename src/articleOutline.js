// Reading aids derived from body blocks: section outline and estimated reading time.
export const sectionId = index => `section-${index}`;

export function articleOutline(body) {
  return body.flatMap((block, index) => {
    if (block.h) return [{ id: sectionId(index), level: 2, text: block.h }];
    if (block.h3) return [{ id: sectionId(index), level: 3, text: block.h3 }];
    return [];
  });
}

const textOf = value => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  return value && !value.img ? Object.entries(value).filter(([key]) => key !== 'align').map(([, v]) => textOf(v)).join(' ') : '';
};

// About 400 Chinese characters a minute; Latin words and numbers count as one each.
export function readingMinutes(body) {
  const text = textOf(body).replace(/\]\([^)]*\)/g, ']');
  const count = (text.match(/[㐀-鿿]/g) || []).length + (text.match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.ceil(count / 400));
}

// Short posts read fine without a table of contents.
export const hasOutline = (outline, minutes) => minutes >= 3 && outline.filter(entry => entry.level === 2).length >= 3;
