// script.js (module)
import { supabase, SUPA_URL } from './supabase-client.js';

// UI refs
const trendingGrid = document.getElementById('trendingGrid');
const newGrid = document.getElementById('newGrid');
const offersRow = document.getElementById('offersRow');
const bannerCarousel = document.getElementById('bannerCarousel');
const bannerDots = document.getElementById('bannerDots');
const cartCountEl = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const openCart = document.getElementById('openCart');
const closeCart = document.getElementById('closeCart');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckout = document.getElementById('closeCheckout');
const placeOrderBtn = document.getElementById('placeOrder');
const paymentMethodSel = document.getElementById('paymentMethod');
const proofModal = document.getElementById('proofModal');
const submitProofBtn = document.getElementById('submitProof');
const cancelProofBtn = document.getElementById('cancelProof');
const proofMsg = document.getElementById('proofMsg');
const trackBtn = document.getElementById('trackBtn');

let CART = JSON.parse(localStorage.getItem('MYATT_CART') || '[]');
let pendingOrder = null; // used for prepaid proof flow

function saveCart(){ localStorage.setItem('MYATT_CART', JSON.stringify(CART)); renderCartCount(); }
function renderCartCount(){ cartCountEl.innerText = CART.reduce((s,i)=>s+(i.qty||1),0) }

function renderProducts(list, container){
  container.innerHTML = '';
  (list||[]).forEach(p=>{
    const div = document.createElement('div');
    div.className = 'card product-card';
    div.innerHTML = `
      <img src="${(p.images && p.images[0]) || p.image || '/placeholder.jpg'}" />
      <h4 style="margin:8px 0">${p.title}</h4>
      <div class="price">₹${p.price}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn addCart" data-id="${p.id}">Add to Cart</button>
        <a class="btn ghost" href="#" data-id="${p.id}" onclick="viewProduct(event,'${p.id}')">View</a>
      </div>
    `;
    container.appendChild(div);
  });
}

window.viewProduct = (e,id)=>{
  e.preventDefault();
  // open product detail in new tab using supabase static id row
  window.location.href = `#`; // for static version omit page; can expand later
  alert('For demo click Add to Cart. Product detail page can be added.');
}

async function loadAll(){
  // banners/offers
  const { data: banners } = await supabase.from('offers').select('*').order('created_at',{ascending:false});
  bannerCarousel.innerHTML = ''; bannerDots.innerHTML = '';
  (banners||[]).forEach((b,i)=>{
    const el = document.createElement('div'); el.className='banner-item';
    el.innerHTML = `<img src="${b.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
    bannerCarousel.appendChild(el);
    const dot = document.createElement('button'); dot.className='dot'; dot.innerText = i+1;
    dot.addEventListener('click', ()=>{ bannerCarousel.scrollLeft = i * bannerCarousel.clientWidth; });
    bannerDots.appendChild(dot);
  });

  // products
  const { data: products } = await supabase.from('products').select('*').order('created_at',{ascending:false});
  // split trending/new for demo
  const trending = (products||[]).slice(0,8);
  const newarr = (products||[]).slice(8,20);
  renderProducts(trending, trendingGrid);
  renderProducts(newarr, newGrid);

  // offers row
  offersRow.innerHTML = '';
  (banners||[]).forEach(b=>{
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<img src="${b.image_url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px">`;
    offersRow.appendChild(el);
  });

  // attach add to cart handlers
  document.querySelectorAll('.addCart').forEach(b=>{
    b.addEventListener('click', async (ev)=>{
      const id = ev.target.dataset.id;
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      if(!data) return alert('Product not found');
      const existing = CART.find(x=>x.id===data.id);
      if(existing) existing.qty = (existing.qty||1)+1;
      else CART.push({ id: data.id, title: data.title || data.name, price: data.price, qty:1 });
      saveCart();
      alert('Added to cart');
    });
  });
}

function renderCart(){
  cartItemsEl.innerHTML = '';
  let total = 0;
  CART.forEach((it,idx)=>{
    total += Number(it.price) * (it.qty||1);
    const r = document.createElement('div'); r.className='card';
    r.style.marginBottom='8px';
    r.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div><strong>${it.title}</strong><div style="color:#666">Qty: ${it.qty}</div></div>
      <div>₹${Number(it.price)*(it.qty||1)}</div>
    </div>
    <div style="margin-top:8px; text-align:right"><button class="btn ghost remove" data-idx="${idx}">Remove</button></div>`;
    cartItemsEl.appendChild(r);
  });
  cartTotalEl.innerText = `Total: ₹${total}`;
  document.querySelectorAll('.remove').forEach(b=> b.addEventListener('click', (e)=>{
    const i = Number(e.target.dataset.idx); CART.splice(i,1); saveCart(); renderCart();
  }));
}

openCart.addEventListener('click', ()=>{ renderCart(); cartModal.style.display='flex'; });
closeCart && closeCart.addEventListener('click', ()=>cartModal.style.display='none');
checkoutBtn.addEventListener('click', ()=>{ cartModal.style.display='none'; showCheckout(); });

function showCheckout(){
  if(!CART.length){ alert('Cart empty'); return;}
  // fill summary
  const summary = document.getElementById('checkoutSummary');
  summary.innerHTML = CART.map(i=> `<div>${i.title} × ${i.qty||1} — ₹${i.price*(i.qty||1)}</div>`).join('');
  document.getElementById('custName').value = '';
  document.getElementById('custPhone').value = '';
  document.getElementById('custAddress').value = '';
  checkoutModal.style.display = 'flex';
}

closeCheckout.addEventListener('click', ()=> checkoutModal.style.display='none');

placeOrderBtn.addEventListener('click', async ()=>{
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const paymentMethod = paymentMethodSel.value;
  if(!name || !phone || !address) return alert('Fill all details');

  const total = CART.reduce((s,i)=>s + (Number(i.price)*(i.qty||1)),0);
  const orderPayload = {
    order_number: `MA-${Date.now()}`,
    customer_name: name,
    customer_phone: phone,
    customer_address: address,
    items: CART,
    total,
    payment_method: paymentMethod,
    payment_status: paymentMethod === 'cod' ? 'cod' : 'pending_proof',
    order_status: paymentMethod === 'cod' ? 'confirmed' : 'pending_verification'
  };

  // If COD -> directly insert order and notify via wa.me
  if(paymentMethod === 'cod'){
    const { data, error } = await supabase.from('orders').insert([orderPayload]).select().single();
    if(error) return alert('Order save failed: ' + error.message);
    // notify admin via wa.me
    const adminPhone = '+917887474741';
    const adminMsg = `New COD Order\nOrder:${data.order_number}\nName:${name}\nPhone:${phone}\nTotal:₹${total}`;
    window.open(`https://wa.me/${adminPhone.replace('+','')}?text=${encodeURIComponent(adminMsg)}`, '_blank');
    alert('Order placed (COD). Admin notified.');
    CART = []; saveCart(); checkoutModal.style.display='none';
    return;
  }

  // Prepaid: show payment instructions (simple flow) -> ask to upload proof (or integrate razorpay)
  // We create a pending order locally and open proof modal for upload (user will upload screenshot/UTR)
  pendingOrder = orderPayload;
  // Show proof modal
  proofModal.style.display = 'flex';
});

cancelProofBtn.addEventListener('click', ()=>{ proofModal.style.display = 'none'; pendingOrder = null; });

submitProofBtn.addEventListener('click', async ()=>{
  if(!pendingOrder) return alert('No pending order');
  const utr = document.getElementById('utrInput').value.trim();
  const file = document.getElementById('proofFile').files[0];
  if(!file) return proofMsg.innerText = 'Choose proof file';
  proofMsg.innerText = 'Uploading...';

  const fname = `proofs/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('payment-proofs').upload(fname, file);
  if(upErr) { proofMsg.innerText = 'Upload error: ' + upErr.message; return; }
  const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fname);
  const proofUrl = urlData.publicUrl;

  // insert order with proof and pending_verification
  pendingOrder.payment_proof_url = proofUrl;
  pendingOrder.utr_number = utr;
  pendingOrder.payment_status = 'pending_verification';

  const { data, error } = await supabase.from('orders').insert([pendingOrder]).select().single();
  if(error){ proofMsg.innerText = 'Save error: ' + error.message; return; }

  // notify admin via wa.me
  const adminPhone = '+917887474741';
  const adminMsg = `New Prepaid Order (Pending verification)\nOrder:${data.order_number}\nName:${data.customer_name}\nPhone:${data.customer_phone}\nTotal:₹${data.total}\nUTR:${data.utr_number}`;
  window.open(`https://wa.me/${adminPhone.replace('+','')}?text=${encodeURIComponent(adminMsg)}`, '_blank');

  proofMsg.innerText = 'Uploaded & order placed. Admin will verify.';
  proofModal.style.display = 'none';
  pendingOrder = null;
  CART = []; saveCart(); checkoutModal.style.display='none';
});

trackBtn.addEventListener('click', async ()=>{
  const phone = document.getElementById('trackPhone').value.trim();
  if(!phone) return alert('Enter phone');
  const { data } = await supabase.from('orders').select('*').eq('customer_phone', phone).order('created_at',{ascending:false});
  const out = document.getElementById('trackResults');
  out.innerHTML = '';
  (data||[]).forEach(o=>{
    const el = document.createElement('div'); el.className='card'; el.style.marginBottom='10px';
    el.innerHTML = `<div><strong>${o.order_number || o.id}</strong> — ₹${o.total}</div>
      <div>Status: ${o.order_status || o.payment_status}</div>
      <div>UTR: ${o.utr_number || '—'}</div>
      <div style="margin-top:8px"><a href="${o.payment_proof_url || '#'}" target="_blank">Proof</a></div>`;
    out.appendChild(el);
  });
});

// initial load
renderCartCount();
loadAll();
