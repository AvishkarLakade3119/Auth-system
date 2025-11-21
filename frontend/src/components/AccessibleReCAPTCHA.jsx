import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const AccessibleReCAPTCHA = forwardRef((props, ref) => {
  const recaptchaRef = useRef(null);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    },
    execute: () => {
      if (recaptchaRef.current) {
        return recaptchaRef.current.execute();
      }
    },
    executeAsync: () => {
      if (recaptchaRef.current) {
        return recaptchaRef.current.executeAsync();
      }
    },
    getValue: () => {
      if (recaptchaRef.current) {
        return recaptchaRef.current.getValue();
      }
    }
  }));

  useEffect(() => {
    // Monitor for reCAPTCHA iframe and fix accessibility issues
    const fixAccessibility = () => {
      if (containerRef.current) {
        // Find all elements with aria-hidden="true" that contain focusable elements
        const ariaHiddenElements = containerRef.current.querySelectorAll('[aria-hidden="true"]');
        
        ariaHiddenElements.forEach(element => {
          // Check if this element contains focusable elements
          const focusableElements = element.querySelectorAll(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), td[id*="rc-imageselect-tile"]'
          );
          
          if (focusableElements.length > 0) {
            // Remove aria-hidden from elements containing focusable children
            element.removeAttribute('aria-hidden');
            
            // Add inert attribute instead (if supported)
            if ('inert' in element) {
              // Don't add inert if there are focusable elements
              // as we want them to remain accessible
            } else {
              // For older browsers, ensure proper ARIA attributes
              element.setAttribute('role', 'presentation');
            }
          }
        });

        // Specifically handle rc-imageselect elements
        const imageSelectTargets = containerRef.current.querySelectorAll('.rc-imageselect-target');
        imageSelectTargets.forEach(target => {
          if (target.hasAttribute('aria-hidden')) {
            target.removeAttribute('aria-hidden');
          }
          // Ensure proper role
          if (target.getAttribute('role') === 'presentation') {
            target.setAttribute('role', 'group');
            target.setAttribute('aria-label', 'Image selection challenge');
          }
        });

        // Fix table accessibility
        const tables = containerRef.current.querySelectorAll('.rc-imageselect-table-44, .rc-imageselect-table-33');
        tables.forEach(table => {
          if (!table.hasAttribute('role')) {
            table.setAttribute('role', 'grid');
            table.setAttribute('aria-label', 'Select all images that match the challenge');
          }
        });

        // Fix individual tiles
        const tiles = containerRef.current.querySelectorAll('td[id*="rc-imageselect-tile"]');
        tiles.forEach(tile => {
          if (!tile.hasAttribute('role')) {
            tile.setAttribute('role', 'gridcell');
            tile.setAttribute('tabindex', '0');
          }
        });
      }
    };

    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      fixAccessibility();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-hidden', 'role', 'tabindex']
      });
    }

    // Initial fix
    setTimeout(fixAccessibility, 100);
    setTimeout(fixAccessibility, 500);
    setTimeout(fixAccessibility, 1000);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle onChange to fix accessibility after user interaction
  const handleChange = (value) => {
    if (props.onChange) {
      props.onChange(value);
    }
    // Fix accessibility after change
    setTimeout(() => {
      const fixEvent = new Event('fixAccessibility');
      if (containerRef.current) {
        containerRef.current.dispatchEvent(fixEvent);
      }
    }, 100);
  };

  return (
    <div ref={containerRef} className="accessible-recaptcha-wrapper">
      <ReCAPTCHA
        ref={recaptchaRef}
        {...props}
        onChange={handleChange}
      />
      <style>{`
        .accessible-recaptcha-wrapper {
          position: relative;
        }
        
        /* Ensure focusable elements are not hidden */
        .accessible-recaptcha-wrapper [aria-hidden="true"] td[id*="rc-imageselect-tile"] {
          visibility: visible !important;
        }
        
        /* Improve focus indicators */
        .accessible-recaptcha-wrapper td[id*="rc-imageselect-tile"]:focus {
          outline: 2px solid #4285f4;
          outline-offset: 2px;
        }
        
        /* Ensure proper contrast for accessibility */
        .accessible-recaptcha-wrapper .rc-imageselect-instructions {
          color: #202124;
        }
      `}</style>
    </div>
  );
});

AccessibleReCAPTCHA.displayName = 'AccessibleReCAPTCHA';

export default AccessibleReCAPTCHA;