(function(){'use strict';
// Prevent duplicate execution
if(window.__ianiConfiguratorLoaded)return;
window.__ianiConfiguratorLoaded=true;

console.log('[Iani] Script loaded');
const containers=document.querySelectorAll('[id^="iani-3d-configurator-"]');
console.log('[Iani] Found containers:',containers.length);
if(!containers.length)return;

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
    autoLoad:w.dataset.autoLoad==='true'
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
    iframe.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;fullscreen';
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
      if(d.type==='IANI_READY'&&iframe&&iframe.contentWindow){
        iframe.contentWindow.postMessage({type:'IANI_INIT',payload:{productId:c.productId,variantId:c.variantId,productTitle:c.productTitle,productPrice:c.productPrice,shop:c.shop,currency:c.currency,moneyFormat:c.moneyFormat}},c.configuratorUrl);
      }
      if(d.type==='IANI_ADD_TO_CART'||d.type==='ADD_TO_CART'){
        const p=d.payload||d;
        const props=p.configuration||p.properties||{};
        if(p.configurationId)props['_configuration_id']=p.configurationId;
        if(p.previewImage)props['_preview_image']=p.previewImage;
        fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.variantId||c.variantId,quantity:p.quantity||1,properties:props})}).then(r=>r.json()).then(item=>{
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
