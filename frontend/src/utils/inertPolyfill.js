/**
 * Inert attribute polyfill for browsers that don't support it
 * This helps with accessibility by properly handling non-interactive content
 */

export function applyInertPolyfill() {
  // Check if inert is already supported
  if ('inert' in HTMLElement.prototype) {
    return;
  }

  // Define inert property
  Object.defineProperty(HTMLElement.prototype, 'inert', {
    enumerable: true,
    get: function() {
      return this.hasAttribute('inert');
    },
    set: function(inert) {
      if (inert) {
        this.setAttribute('inert', '');
        // Make element and its descendants unfocusable
        this.setAttribute('aria-hidden', 'true');
        
        // Store original tabindex values
        const focusableElements = this.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(el => {
          if (!el.hasAttribute('data-original-tabindex')) {
            el.setAttribute('data-original-tabindex', el.getAttribute('tabindex') || '');
          }
          el.setAttribute('tabindex', '-1');
        });
      } else {
        this.removeAttribute('inert');
        this.removeAttribute('aria-hidden');
        
        // Restore original tabindex values
        const focusableElements = this.querySelectorAll('[data-original-tabindex]');
        focusableElements.forEach(el => {
          const originalTabindex = el.getAttribute('data-original-tabindex');
          if (originalTabindex) {
            el.setAttribute('tabindex', originalTabindex);
          } else {
            el.removeAttribute('tabindex');
          }
          el.removeAttribute('data-original-tabindex');
        });
      }
    }
  });
}

// Auto-apply polyfill when module is imported
if (typeof window !== 'undefined') {
  applyInertPolyfill();
}