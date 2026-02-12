(function(){'use strict';
// Prevent duplicate execution
if(window.__ianiConfiguratorLoaded)return;
window.__ianiConfiguratorLoaded=true;

console.log('[Iani] Script loaded');

// Check if we're on the cart page and need to display preview images
if(window.location.pathname==='/cart'||window.location.pathname.includes('/cart')){
  console.log('[Iani] Cart page detected, checking for preview images');

  function applyCartPreviews(){
    const storedPreviews=JSON.parse(localStorage.getItem('iani_cart_previews')||'{}');
    console.log('[Iani] Stored previews:',Object.keys(storedPreviews));

    // Find all cart items - try multiple selectors for different themes
    const cartItems=document.querySelectorAll('.cart-item, [data-cart-item], .cart__item, tr[data-line-item], .cart-item__details, [class*="cart-item"], [class*="CartItem"], .line-item');
    console.log('[Iani] Found cart items:',cartItems.length);

    cartItems.forEach(function(item){
      // Look for configuration ID in the item's text or data attributes
      const itemText=item.textContent||'';
      const itemHTML=item.innerHTML||'';

      // Find configuration ID from properties displayed
      let configId=null;
      const configMatch=itemText.match(/config_\d+_[a-z0-9]+/i)||itemHTML.match(/config_\d+_[a-z0-9]+/i);
      if(configMatch){
        configId=configMatch[0];
        console.log('[Iani] Found config ID in item:',configId);
      }

      // If we found a config ID and have a preview for it
      if(configId&&storedPreviews[configId]){
        // Find the image in this cart item (go up to parent if needed)
        let img=item.querySelector('img');
        if(!img){
          const parent=item.closest('tr, .cart-item, [class*="cart-item"]');
          if(parent)img=parent.querySelector('img');
        }

        if(img){
          console.log('[Iani] Replacing image for config:',configId);
          img.src=storedPreviews[configId];
          img.style.objectFit='cover';
          img.style.backgroundColor='#f8f9fa';
          // Add a subtle border to indicate it's a custom preview
          img.style.border='2px solid #4CAF50';
          img.style.borderRadius='4px';
        }
      }
    });
  }

  // Run on page load and after a short delay (for dynamic content)
  if(document.readyState==='complete'){
    applyCartPreviews();
  }else{
    window.addEventListener('load',applyCartPreviews);
  }
  setTimeout(applyCartPreviews,1000);
  setTimeout(applyCartPreviews,2500); // Retry for slow-loading themes
}

const containers=document.querySelectorAll('[id^="iani-3d-configurator-"]');
console.log('[Iani] Found containers:',containers.length);

// Exit only if not on cart page AND no containers found
if(!containers.length){
  // Still allow the cart preview functionality to work
  console.log('[Iani] No configurator containers found, but cart preview may still work');
  return;
}

containers.forEach(function(w){
  const c={
    blockId:w.dataset.blockId,
    productId:w.dataset.productId,
    productHandle:w.dataset.productHandle,
    variantId:w.dataset.variantId,
    productTitle:w.dataset.productTitle,
    productPrice:w.dataset.productPrice,
    shop:w.dataset.shop,
    currency:w.dataset.currency,
    moneyFormat:w.dataset.moneyFormat,
    configuratorUrl:w.dataset.configuratorUrl||'https://iani-configurator.vercel.app',
    displayMode:w.dataset.displayMode,
    autoLoad:w.dataset.autoLoad==='true',
    modelUrl:w.dataset.modelUrl||''
  };
  console.log('[Iani] Config:',c);

  const container=w.querySelector('.iani-configurator-container');
  const modalOverlay=w.querySelector('.iani-modal-overlay');
  const modalTrigger=w.querySelector('.iani-modal-trigger');
  const modalClose=w.querySelector('.iani-modal-close');
  const fullscreenTrigger=w.querySelector('.iani-fullscreen-trigger');

  console.log('[Iani] Elements found:', {
    container: !!container,
    modalOverlay: !!modalOverlay,
    modalTrigger: !!modalTrigger,
    modalClose: !!modalClose,
    displayMode: c.displayMode
  });

  let iframe=null;

  function buildUrl(){
    const u=new URL(c.configuratorUrl);
    u.searchParams.set('product',c.productId);
    u.searchParams.set('variant',c.variantId);
    u.searchParams.set('shop',c.shop);
    u.searchParams.set('handle',c.productHandle);
    u.searchParams.set('currency',c.currency);
    u.searchParams.set('embedded','true');
    if(c.productPrice)u.searchParams.set('price',c.productPrice);
    if(c.modelUrl)u.searchParams.set('modelUrl',c.modelUrl);
    console.log('[Iani] Iframe URL:',u.toString());
    return u.toString();
  }

  function createIframe(t){
    if(iframe){
      console.log('[Iani] Iframe already exists');
      return iframe;
    }
    console.log('[Iani] Creating iframe in:',t);
    iframe=document.createElement('iframe');
    iframe.className='iani-configurator-iframe';
    iframe.src=buildUrl();
    iframe.style.cssText='width:100%;height:100%;border:none;display:block;min-height:500px;';
    iframe.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;fullscreen;camera;microphone';
    iframe.setAttribute('loading','eager');
    iframe.setAttribute('title','3D Configurator');
    iframe.onload=function(){
      console.log('[Iani] Iframe loaded successfully');
      const l=t.querySelector('.iani-loading');
      if(l)l.style.display='none';
    };
    iframe.onerror=function(e){
      console.error('[Iani] Iframe error:',e);
    };
    t.appendChild(iframe);
    console.log('[Iani] Iframe appended to container');
    return iframe;
  }

  function handleMsg(e){
    try{
      const origin=new URL(c.configuratorUrl).origin;
      if(e.origin!==origin)return;
      const d=e.data;
      if(!d||typeof d!=='object')return;
      console.log('[Iani] Message received:',d.type);

      // Handle Virtual Try-On state changes - hide/show modal close button
      if(d.type==='IANI_TRYON_OPENED'){
        console.log('[Iani] Try-On opened, hiding modal close button');
        if(modalClose)modalClose.style.display='none';
      }
      if(d.type==='IANI_TRYON_CLOSED'){
        console.log('[Iani] Try-On closed, showing modal close button');
        if(modalClose)modalClose.style.display='flex';
      }
      if(d.type==='IANI_READY'&&iframe&&iframe.contentWindow){
        iframe.contentWindow.postMessage({type:'IANI_INIT',payload:{productId:c.productId,variantId:c.variantId,productTitle:c.productTitle,productPrice:c.productPrice,shop:c.shop,currency:c.currency,moneyFormat:c.moneyFormat}},c.configuratorUrl);
      }
      if(d.type==='IANI_ADD_TO_CART'||d.type==='ADD_TO_CART'){
        const p=d.payload||d;
        const props=p.configuration||p.properties||{};
        const configId=p.configurationId||('config_'+Date.now());
        const variantId=p.variantId||c.variantId;
        // Store config ID without underscore so it's visible in cart HTML (needed for price matching)
        if(configId)props['Configuration ID']=configId;

        // Add configured price as visible property ONLY if there are extra costs
        // p.price is only included by the configurator when totalExtraCost > 0
        if(p.price){
          props['Configured Price']='$'+Number(p.price).toFixed(2);
          // Store price in localStorage for cart display and draft order
          try{
            const prices=JSON.parse(localStorage.getItem('iani_cart_prices')||'{}');
            prices[configId]=Number(p.price);
            localStorage.setItem('iani_cart_prices',JSON.stringify(prices));
            console.log('[Iani] Configured price stored (has extra costs):',p.price);
          }catch(e){console.warn('[Iani] Could not store price:',e);}
        }else{
          console.log('[Iani] No extra costs - using base Shopify price');
        }

        // Store line item data for draft order creation
        try{
          const items=JSON.parse(localStorage.getItem('iani_cart_items')||'{}');
          items[configId]={
            variantId:variantId,
            configuredPrice:p.price?Number(p.price):null,
            configuration:p.configuration||{},
            productId:p.productId||c.productId
          };
          localStorage.setItem('iani_cart_items',JSON.stringify(items));
          console.log('[Iani] Line item data stored for config:',configId);
        }catch(e){console.warn('[Iani] Could not store line item:',e);}

        // Store preview image in localStorage with config ID for proper matching
        if(p.previewImage){
          try{
            const previews=JSON.parse(localStorage.getItem('iani_cart_previews')||'{}');
            previews[configId]=p.previewImage;
            localStorage.setItem('iani_cart_previews',JSON.stringify(previews));
            console.log('[Iani] Preview image stored for config:',configId);
          }catch(e){console.warn('[Iani] Could not store preview:',e);}
        }

        fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:variantId,quantity:p.quantity||1,properties:props})}).then(r=>r.json()).then(item=>{
          if(iframe&&iframe.contentWindow)iframe.contentWindow.postMessage({type:'IANI_CART_SUCCESS',payload:item},c.configuratorUrl);
          fetch('/cart.js').then(r=>r.json()).then(cart=>{
            ['.cart-count','.cart-count-bubble','[data-cart-count]'].forEach(s=>{const el=document.querySelector(s);if(el)el.textContent=cart.item_count});
          });
          if(p.redirectToCart!==false)setTimeout(()=>location.href='/cart',500);
        }).catch(err=>{
          if(iframe&&iframe.contentWindow)iframe.contentWindow.postMessage({type:'IANI_CART_ERROR',payload:{message:err.message}},c.configuratorUrl);
          alert('Failed to add to cart.');
        });
      }
      if(d.type==='IANI_CLOSE')closeModal();
    }catch(err){console.error('[Iani] handleMsg error:',err);}
  }

  function openModal(){
    console.log('[Iani] openModal called');
    if(!modalOverlay){
      console.error('[Iani] No modal overlay found!');
      return;
    }
    // Move modal to body to escape any container constraints
    if(modalOverlay.parentElement!==document.body){
      document.body.appendChild(modalOverlay);
    }
    modalOverlay.style.display='flex';
    modalOverlay.classList.add('active');
    document.body.style.overflow='hidden';
    const mc=modalOverlay.querySelector('.iani-configurator-container');
    console.log('[Iani] Modal container found:',!!mc);
    if(mc){
      createIframe(mc);
    }
  }

  function closeModal(){
    console.log('[Iani] closeModal called');
    if(!modalOverlay)return;
    modalOverlay.style.display='none';
    modalOverlay.classList.remove('active');
    document.body.style.overflow='';
  }

  function openFullscreen(){
    if(w.requestFullscreen)w.requestFullscreen();
    else if(w.webkitRequestFullscreen)w.webkitRequestFullscreen();
  }

  window.addEventListener('message',handleMsg);

  // Modal mode setup
  if(c.displayMode==='modal'){
    console.log('[Iani] Setting up modal mode');
    if(modalTrigger){
      console.log('[Iani] Adding click handler to modal trigger');
      modalTrigger.addEventListener('click',function(e){
        console.log('[Iani] Modal trigger clicked!');
        e.preventDefault();
        openModal();
      });
    }else{
      console.warn('[Iani] No modal trigger button found!');
    }
    if(modalClose){
      modalClose.addEventListener('click',function(e){
        e.preventDefault();
        closeModal();
      });
    }
    if(modalOverlay){
      modalOverlay.addEventListener('click',function(e){
        if(e.target===modalOverlay)closeModal();
      });
    }
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&modalOverlay&&modalOverlay.classList.contains('active'))closeModal();
    });
  }

  // Inline mode setup
  if(c.displayMode==='inline'){
    console.log('[Iani] Setting up inline mode');
    if(c.autoLoad){
      console.log('[Iani] Auto-loading iframe');
      createIframe(container);
    }else{
      const btn=container.querySelector('.iani-modal-trigger');
      if(btn){
        btn.addEventListener('click',function(){
          btn.style.display='none';
          container.insertAdjacentHTML('beforeend','<div class="iani-loading"><div class="iani-loading-spinner"></div><span class="iani-loading-text">Loading...</span></div>');
          createIframe(container);
        });
      }
    }
  }

  if(fullscreenTrigger)fullscreenTrigger.addEventListener('click',openFullscreen);

  console.log('[Iani] Setup complete for block:',c.blockId);
});
})();
