// Rewrites `[text](cpp-api:path.html)` to the Doxygen output, so project docs don't hard-code the
// site's base path (Docusaurus prepends baseUrl to pathname:// links).
export default function cppApiLinks() {
  const visit = (node) => {
    if (node.type === 'link' && node.url.startsWith('cpp-api:')) {
      node.url = `pathname:///cpp-api/${node.url.slice('cpp-api:'.length).replace(/^\/+/, '')}`;
    }
    node.children?.forEach(visit);
  };
  return visit;
}
