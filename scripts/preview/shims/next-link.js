import { jsx } from './jsx-runtime.js';

/** In-page navigation for the preview: same markup as next/link, no server. */
export function navigate(href) {
  window.dispatchEvent(new CustomEvent('preview-nav', { detail: href }));
}

export default function Link({ href, children, onClick, ...rest }) {
  return jsx('a', {
    ...rest,
    href,
    onClick: (e) => {
      onClick?.(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      navigate(href);
    },
    children,
  });
}
