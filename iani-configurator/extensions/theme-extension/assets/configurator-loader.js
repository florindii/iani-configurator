(function() {
  'use strict';
  if (window.__ianiConfiguratorLoaded) return;
  window.__ianiConfiguratorLoaded = true;

  var containers = document.querySelectorAll('[id^="iani-3d-configurator-"]');
  if (!containers.length) return;

  var API_BASE = 'https://iani-configurator-1.onrender.com';
  var CONFIGURATOR_BASE = 'https://iani-configurator.vercel.app';

  containers.forEach(function(w) {
    var c = {
      blockId: w.dataset.blockId,
      productId: w.dataset.productId,
      productHandle: w.dataset.productHandle,
      variantId: w.dataset.variantId,
      productTitle: w.dataset.productTitle,
      productPrice: w.dataset.productPrice,
      shop: w.dataset.shop,
      currency: w.dataset.currency,
      moneyFormat: w.dataset.moneyFormat,
      configuratorUrl: w.dataset.configuratorUrl || CONFIGURATOR_BASE,
      displayMode: w.dataset.displayMode,
      autoLoad: w.dataset.autoLoad === 'true',
      modelUrl: w.dataset.modelUrl || ''
    };

    var container = w.querySelector('.iani-configurator-container');
    var modalOverlay = w.querySelector('.iani-modal-overlay');
    var modalTrigger = w.querySelector('.iani-modal-trigger');
    var modalClose = w.querySelector('.iani-modal-close');
    var fullscreenTrigger = w.querySelector('.iani-fullscreen-trigger');
    var iframe = null;

    function buildUrl() {
      var u = new URL(c.configuratorUrl);
      u.searchParams.set('product', c.productId);
      u.searchParams.set('variant', c.variantId);
      u.searchParams.set('shop', c.shop);
      u.searchParams.set('handle', c.productHandle);
      u.searchParams.set('currency', c.currency);
      u.searchParams.set('embedded', 'true');
      if (c.productPrice) u.searchParams.set('price', c.productPrice);
      if (c.modelUrl) u.searchParams.set('modelUrl', c.modelUrl);
      return u.toString();
    }

    function createIframe(t) {
      if (iframe) return iframe;
      iframe = document.createElement('iframe');
      iframe.className = 'iani-configurator-iframe';
      iframe.src = buildUrl();
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;min-height:500px';
      iframe.allow = 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;fullscreen;camera;microphone;xr-spatial-tracking';
      iframe.setAttribute('loading', 'eager');
      iframe.setAttribute('title', '3D Configurator');
      iframe.onload = function() {
        var l = t.querySelector('.iani-loading');
        if (l) l.style.display = 'none';
      };
      t.appendChild(iframe);
      return iframe;
    }

    function saveConfiguration(configId, configData) {
      // Extract mesh customizations if provided
      var meshCustomizations = configData.meshCustomizations || {};
      var configuration = configData.configuration || {};

      // Merge mesh customizations into the configuration for storage
      configuration._meshCustomizations = JSON.stringify(meshCustomizations);

      return fetch(API_BASE + '/api/save-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configurationId: configId,
          shop: c.shop,
          productId: c.productId,
          variantId: c.variantId,
          productHandle: c.productHandle,
          modelUrl: c.modelUrl,
          colorName: configData.colorName || null,
          colorHex: configData.colorHex || null,
          materialName: configData.materialName || null,
          totalPrice: configData.price || c.productPrice || null,
          configuration: configuration,
          meshCustomizations: meshCustomizations
        })
      }).then(function(r) {
        return r.json();
      }).then(function(result) {
        if (result.success) return result.configurationId;
        return null;
      }).catch(function(err) {
        console.warn('Failed to save configuration:', err);
        return configId;
      });
    }

    function buildViewConfigUrl(configId) {
      var u = new URL(CONFIGURATOR_BASE);
      u.searchParams.set('configId', configId);
      u.searchParams.set('readonly', 'true');
      u.searchParams.set('product', c.productId);
      u.searchParams.set('shop', c.shop);
      if (c.modelUrl) u.searchParams.set('modelUrl', c.modelUrl);
      return u.toString();
    }

    function formatPrice(price, currency) {
      // Use the shop's currency and format
      var numPrice = Number(price);
      if (isNaN(numPrice)) return price;

      var currencyCode = currency || c.currency || 'USD';
      try {
        return numPrice.toLocaleString('en-US', {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      } catch (e) {
        // Fallback if currency is invalid
        return currencyCode + ' ' + numPrice.toFixed(2);
      }
    }

    function addToCart(p, configId) {
      var props = {};
      var variantId = p.variantId || c.variantId;
      var meshCustomizations = p.meshCustomizations || {};

      // Hidden configuration ID
      props['_Configuration ID'] = configId;

      // Process mesh customizations to create visible cart properties
      var customizationKeys = Object.keys(meshCustomizations);
      if (customizationKeys.length > 0) {
        // Add each customized part as a visible property
        customizationKeys.forEach(function(meshName, index) {
          var customization = meshCustomizations[meshName];
          // Create readable part name from mesh name
          var partLabel = meshName
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(function(word) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');

          props['Part ' + (index + 1) + ': ' + partLabel] = customization.colorName;
        });

        // Also add a summary "Colors" property with all unique color names
        var uniqueColors = [];
        customizationKeys.forEach(function(key) {
          var colorName = meshCustomizations[key].colorName;
          if (uniqueColors.indexOf(colorName) === -1) {
            uniqueColors.push(colorName);
          }
        });
        props['Customized Colors'] = uniqueColors.join(', ');
      } else {
        // Fallback to single color if no mesh customizations
        if (p.colorName) props['Color'] = p.colorName;
      }

      // Add material if specified
      if (p.materialName) props['Material'] = p.materialName;

      // Store price using the shop's currency
      var finalPrice = p.price || c.productPrice;
      if (finalPrice) {
        props['Configured Price'] = formatPrice(finalPrice, c.currency);
        try {
          var prices = JSON.parse(localStorage.getItem('iani_cart_prices') || '{}');
          prices[configId] = Number(finalPrice);
          localStorage.setItem('iani_cart_prices', JSON.stringify(prices));
        } catch (x) {}
      }

      // Add view configuration link
      props['View 3D Configuration'] = buildViewConfigUrl(configId);

      // Store in localStorage for cart preview
      try {
        var items = JSON.parse(localStorage.getItem('iani_cart_items') || '{}');
        items[configId] = {
          variantId: variantId,
          configuredPrice: finalPrice ? Number(finalPrice) : null,
          configuration: p.configuration || {},
          meshCustomizations: meshCustomizations,
          productId: p.productId || c.productId,
          viewUrl: buildViewConfigUrl(configId)
        };
        localStorage.setItem('iani_cart_items', JSON.stringify(items));
      } catch (x) {}

      // Add to Shopify cart
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: variantId,
          quantity: p.quantity || 1,
          properties: props
        })
      }).then(function(r) {
        return r.json();
      }).then(function(item) {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'IANI_CART_SUCCESS',
            payload: item
          }, c.configuratorUrl);
        }

        // Update cart count
        fetch('/cart.js').then(function(r) {
          return r.json();
        }).then(function(cart) {
          ['.cart-count', '.cart-count-bubble', '[data-cart-count]'].forEach(function(s) {
            var el = document.querySelector(s);
            if (el) el.textContent = cart.item_count;
          });
        });

        // Redirect to cart
        if (p.redirectToCart !== false) {
          setTimeout(function() {
            location.href = '/cart';
          }, 500);
        }
      }).catch(function(err) {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'IANI_CART_ERROR',
            payload: { message: err.message }
          }, c.configuratorUrl);
        }
        alert('Failed to add to cart.');
      });
    }

    function handleMsg(e) {
      try {
        if (e.origin !== (new URL(c.configuratorUrl)).origin) return;
        var d = e.data;
        if (!d || typeof d !== 'object') return;

        if (d.type === 'IANI_TRYON_OPENED' && modalClose) {
          modalClose.style.display = 'none';
        }

        if (d.type === 'IANI_TRYON_CLOSED' && modalClose) {
          modalClose.style.display = 'flex';
        }

        if (d.type === 'IANI_READY' && iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'IANI_INIT',
            payload: {
              productId: c.productId,
              variantId: c.variantId,
              productTitle: c.productTitle,
              productPrice: c.productPrice,
              shop: c.shop,
              currency: c.currency,
              moneyFormat: c.moneyFormat
            }
          }, c.configuratorUrl);
        }

        if (d.type === 'IANI_ADD_TO_CART' || d.type === 'ADD_TO_CART') {
          var p = d.payload || d;
          var configId = 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          p.configurationId = configId;

          saveConfiguration(configId, p).then(function(savedId) {
            addToCart(p, savedId || configId);
          });
        }

        if (d.type === 'IANI_CLOSE') {
          closeModal();
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    }

    function openModal() {
      if (!modalOverlay) return;
      if (modalOverlay.parentElement !== document.body) {
        document.body.appendChild(modalOverlay);
      }
      modalOverlay.style.display = 'flex';
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      var mc = modalOverlay.querySelector('.iani-configurator-container');
      if (mc) createIframe(mc);
    }

    function closeModal() {
      if (!modalOverlay) return;
      modalOverlay.style.display = 'none';
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    window.addEventListener('message', handleMsg);

    if (c.displayMode === 'modal') {
      if (modalTrigger) {
        modalTrigger.addEventListener('click', function(e) {
          e.preventDefault();
          openModal();
        });
      }
      if (modalClose) {
        modalClose.addEventListener('click', function(e) {
          e.preventDefault();
          closeModal();
        });
      }
      if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
          if (e.target === modalOverlay) closeModal();
        });
      }
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
          closeModal();
        }
      });
    }

    if (c.displayMode === 'inline') {
      if (c.autoLoad) {
        createIframe(container);
      } else {
        var btn = container.querySelector('.iani-modal-trigger');
        if (btn) {
          btn.addEventListener('click', function() {
            btn.style.display = 'none';
            container.insertAdjacentHTML('beforeend', '<div class="iani-loading"><div class="iani-loading-spinner"></div><span class="iani-loading-text">Loading...</span></div>');
            createIframe(container);
          });
        }
      }
    }

    if (fullscreenTrigger) {
      fullscreenTrigger.addEventListener('click', function() {
        if (w.requestFullscreen) {
          w.requestFullscreen();
        } else if (w.webkitRequestFullscreen) {
          w.webkitRequestFullscreen();
        }
      });
    }
  });
})();
