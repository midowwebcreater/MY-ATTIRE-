// admin.js
import { supabase } from './supabase-client.js';

const ADMIN_USER = 'my ATTIRE'; // confirm if you want different
const ADMIN_PASS = 'myattire@123';

const loginCard = document.getElementById('loginCard');
const adminArea = document.getElementById('adminArea');
const loginBtn = document.getElementById('adminLoginBtn');
const loginMsg = document.getElementById('loginMsg');
const adminMsg = document.getElementById('adminMsg');

loginBtn.addEventListener('click', ()=>{
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value.trim();
  if(u === ADMIN_USER && p === ADMIN_PASS){
    loginCard.style.display = 'none';
    adminArea.style.display = 'block';
    loadAdminData();
  } else loginMsg.innerText = 'Invalid credentials';
});

async function loadAdminData(){
  // product list
  const { data: products } = await supabase.from('products').select('*').order('created_at',{ascending:false});
  const productsList = document.getElementById('productsList');
  productsList.innerHTML = '';
  (products||[]).forEach(p=>{
    const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
    el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${p.title}</strong><div>₹${p.price}</div></div>
      <div><button class="btn edit" data-id="${p.id}">Edit</button> <button class="btn ghost del" data-id="${p.id}">Delete</button></div></div>`;
    productsList.appendChild(el);
  });
  document.querySelectorAll('.del').forEach(b => b.addEventListener('click', async (e)=>{
    if(!confirm('Delete product?')) return;
    const id = e.target.dataset.id;
    await supabase.from('products').delete().eq('id', id);
    loadAdminData();
  }));

  // orders pending verification
  const { data: orders } = await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(100);
  const ordersList = document.getElementById('ordersList');
  ordersList.innerHTML = '';
  (orders||[]).forEach(o=>{
    const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
    el.innerHTML = `<div><strong>${o.order_number || o.id}</strong> — ${o.customer_name} — ₹${o.total}</div>
      <div>Payment: ${o.payment_status || '—'} — UTR: ${o.utr_number || '—'}</div>
      <div style="margin-top:8px">
        <a href="${o.payment_proof_url||'#'}" target="_blank" class="btn ghost">View Proof</a>
        <button class="btn verify" data-id="${o.id}">Verify & Confirm</button>
      </div>`;
    ordersList.appendChild(el);
  });

  document.querySelectorAll('.verify').forEach(b => b.addEventListener('click', async (e)=>{
    const id = e.target.dataset.id;
    const { data, error } = await supabase.from('orders').update({ payment_status:'paid', order_status:'confirmed', payment_verified_by: 'admin', payment_verified_at: new Date().toISOString() }).eq('id', id).select().single();
    if(error) return alert('Update error: '+error.message);
    // notify customer via wa.me
    const custPhone = data.customer_phone;
    const msg = `Hi ${data.customer_name}, your payment for order ${data.order_number} has been verified. We will process your order.`;
    window.open(`https://wa.me/${custPhone.replace('+','')}?text=${encodeURIComponent(msg)}`, '_blank');
    alert('Order verified & customer notified.');
    loadAdminData();
  }));
}

// add product
document.getElementById('addProductBtn').addEventListener('click', async ()=>{
  const title = document.getElementById('pTitle').value.trim();
  const price = document.getElementById('pPrice').value.trim();
  const category = document.getElementById('pCategory').value.trim();
  const desc = document.getElementById('pDesc').value.trim();
  const imagesInp = document.getElementById('pImages');
  const videoInp = document.getElementById('pVideo');
  if(!title || !price) return adminMsg.innerText = 'Title & price required';

  adminMsg.innerText = 'Uploading...';
  const imageUrls = [];
  if(imagesInp.files.length){
    for(const f of imagesInp.files){
      const name = `p-${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from('product-images').upload(name, f);
      if(error){ adminMsg.innerText = 'Image upload error: '+error.message; return; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(name);
      imageUrls.push(data.publicUrl);
    }
  }
  let videoUrl = '';
  if(videoInp.files.length){
    const vf = videoInp.files[0];
    const vname = `v-${Date.now()}-${vf.name}`;
    const { error } = await supabase.storage.from('product-videos').upload(vname, vf);
    if(error){ adminMsg.innerText = 'Video upload error'; return; }
    const { data } = supabase.storage.from('product-videos').getPublicUrl(vname);
    videoUrl = data.publicUrl;
  }

  const { data, error } = await supabase.from('products').insert([{ title, price, category, description: desc, images: imageUrls, video_url: videoUrl }]).select().single();
  if(error) return adminMsg.innerText = 'Insert error: '+error.message;
  adminMsg.innerText = 'Product added';
  document.getElementById('pTitle').value=''; document.getElementById('pPrice').value=''; document.getElementById('pCategory').value=''; document.getElementById('pDesc').value='';
  loadAdminData();
});

// add banner
document.getElementById('addBannerBtn').addEventListener('click', async ()=>{
  const bTitle = document.getElementById('bTitle').value.trim();
  const bFile = document.getElementById('bImage').files[0];
  if(!bFile) return alert('Choose banner');
  const name = `banner-${Date.now()}-${bFile.name}`;
  const { error } = await supabase.storage.from('offer-banners').upload(name, bFile);
  if(error) return alert('Banner upload error: '+error.message);
  const { data } = supabase.storage.from('offer-banners').getPublicUrl(name);
  await supabase.from('offers').insert([{ title: bTitle, image_url: data.publicUrl }]);
  alert('Banner uploaded');
  loadAdminData();
});
