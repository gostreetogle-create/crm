/**
 * CSS `url("...")` с экранированием для значений вида `data:` и `blob:`.
 */
export function backgroundImageCssUrl(href: string): string {
  const escaped = href.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `url("${escaped}")`;
}

