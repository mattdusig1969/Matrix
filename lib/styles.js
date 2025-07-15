export function parseStyle(cssText) {
  const styles = {};
  const rules = cssText.split('}');
  rules.forEach(rule => {
    const parts = rule.split('{');
    if (parts.length === 2) {
      const selector = parts[0].trim();
      const declarations = parts[1].trim();
      const style = {};
      declarations.split(';').forEach(declaration => {
        const declParts = declaration.split(':');
        if (declParts.length === 2) {
          const key = declParts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
          style[key] = declParts[1].trim();
        }
      });
      styles[selector] = style;
    }
  });
  return styles;
}
