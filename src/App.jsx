import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { spidySellsLogo } from './spidy-logo.js';
import { ArrowLeft, ArrowRight, ChefHat, MapPin, Minus, Plus, ShoppingBag, Clock3, Check, X, Package, Store, ChartNoAxesCombined, Settings, LogOut, RefreshCw, Pencil, Trash2, LockKeyhole, ExternalLink, Phone, MessageCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const whatsappDefault = '';
const rupees = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
const emptyCustomer = {name:'',phone:'',address:'',notes:''};
const defaultSettings = {business_name:'Spidy Sells',whatsapp_number:'',currency:'INR',delivery_enabled:false,delivery_charge:0,pickup_instructions:''};
const defaultOpeningHours = 'Open 4:00 PM – 7:30 PM · Closed Tuesdays & Fridays';
const statusOptions = ['pending','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled','not_converted','whatsapp_initiated'];
const pretty = s => String(s||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const stockMapKey = (productId, branchId) => `${productId}:${branchId}`;
const routeToPage = {'/':'location','/order-type':'type','/menu':'menu','/products':'menu','/reviews':'reviews','/contact':'contact','/about':'about','/bag':'cart','/checkout':'checkout','/order-confirmation':'success','/orders':'history','/admin':'owner'};
const pageToRoute = {location:'/',type:'/order-type',menu:'/products',reviews:'/reviews',contact:'/contact',about:'/about',cart:'/bag',checkout:'/checkout',success:'/order-confirmation',history:'/orders',owner:'/admin',admin:'/admin'};

async function functionErrorMessage(error){
 const context=error?.context;
 if(context&&typeof context.clone==='function'){
  try{const payload=await context.clone().json();if(typeof payload?.message==='string'&&payload.message.trim())return payload.message}catch{}
 }
 return error?.message||'The server could not process this request. Please try again.';
}

function loadRazorpayCheckout(){
 if(window.Razorpay)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-razorpay-checkout]');
  if(existing){
   existing.addEventListener('load',()=>resolve(),{once:true});
   existing.addEventListener('error',()=>reject(new Error('Razorpay checkout could not load. Check your internet connection and try again.')),{once:true});
   return;
  }
  const script=document.createElement('script');
  script.src='https://checkout.razorpay.com/v1/checkout.js';
  script.async=true;
  script.dataset.razorpayCheckout='true';
  script.onload=()=>resolve();
  script.onerror=()=>{script.remove();reject(new Error('Razorpay checkout could not load. Check your internet connection and try again.'))};
  document.head.appendChild(script);
 });
}



function SpiderWelcomeIntro({onSkip}){
 const spokes=Array.from({length:16},(_,index)=>{
  const angle=(-Math.PI/2)+(index*Math.PI/8);
  return {x:500+Math.cos(angle)*382,y:500+Math.sin(angle)*382,index};
 });
 const rings=[48,84,122,162,204,248,292,336,378];
 return <div className="spider-intro" role="dialog" aria-modal="true" aria-label="Spidy Sells welcome animation">
  <div className="spider-intro-wash" aria-hidden="true"/>
  <svg className="spider-intro-web" viewBox="0 0 1000 1000" aria-hidden="true">
   <g className="spider-web-spokes">
    {spokes.map(({x,y,index})=><path key={index} className="spider-web-spoke" pathLength="1" style={{animationDelay:(2.16+index*0.006)+'s'}} d={`M 500 500 L ${x.toFixed(2)} ${y.toFixed(2)}`}/>)}
   </g>
   <g className="spider-web-rings">
    {rings.map((radius,index)=><circle key={radius} className="spider-web-ring" pathLength="1" style={{animationDelay:(2.18+index*0.012)+'s'}} cx="500" cy="500" r={radius}/>)}
    {Array.from({length:8},(_,index)=>{
     const angle=(-Math.PI/2)+(index*Math.PI/4);
     const x=500+Math.cos(angle)*378;
     const y=500+Math.sin(angle)*378;
     const x2=500+Math.cos(angle+Math.PI/4)*378;
     const y2=500+Math.sin(angle+Math.PI/4)*378;
     const qx=500+Math.cos(angle+Math.PI/8)*300;
     const qy=500+Math.sin(angle+Math.PI/8)*300;
     return <path key={'bridge-'+index} className="spider-web-bridge" pathLength="1" style={{animationDelay:(2.20+index*0.008)+'s'}} d={`M ${x.toFixed(2)} ${y.toFixed(2)} Q ${qx.toFixed(2)} ${qy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`}/>;
    })}
   </g>
   <circle className="spider-web-dew" cx="500" cy="500" r="5"/>
  </svg>
  <svg className="spider-intro-silk" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
   <path pathLength="1" d="M 97 95 Q 77 72 50 50"/>
  </svg>
  <div className="spider-intro-drop-thread" aria-hidden="true"/>
  <svg className="spider-intro-crawler" viewBox="0 0 100 100" aria-hidden="true">
   <defs>
    <radialGradient id="spidy-shell" cx="34%" cy="25%" r="75%">
     <stop offset="0%" stopColor="#514035"/>
     <stop offset="46%" stopColor="#2B211B"/>
     <stop offset="100%" stopColor="#17110e"/>
    </radialGradient>
    <linearGradient id="spidy-gold" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0%" stopColor="#E8CF9D"/>
     <stop offset="100%" stopColor="#B18A4B"/>
    </linearGradient>
   </defs>
   <g className="spider-leg-motion" fill="none" stroke="#2B211B" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M42 39 Q31 25 13 22 L5 12"/>
    <path d="M39 45 Q23 38 8 43 L3 38"/>
    <path d="M39 52 Q21 59 10 69 L4 76"/>
    <path d="M43 58 Q32 73 19 82 L13 91"/>
    <path d="M58 39 Q69 25 87 22 L95 12"/>
    <path d="M61 45 Q77 38 92 43 L97 38"/>
    <path d="M61 52 Q79 59 90 69 L96 76"/>
    <path d="M57 58 Q68 73 81 82 L87 91"/>
   </g>
   <g fill="url(#spidy-gold)">
    <circle cx="31" cy="27" r="2.5"/><circle cx="24" cy="39" r="2.5"/><circle cx="22" cy="60" r="2.5"/><circle cx="32" cy="73" r="2.5"/>
    <circle cx="69" cy="27" r="2.5"/><circle cx="76" cy="39" r="2.5"/><circle cx="78" cy="60" r="2.5"/><circle cx="68" cy="73" r="2.5"/>
   </g>
   <ellipse cx="50" cy="58" rx="15" ry="19" fill="url(#spidy-shell)" stroke="#B18A4B" strokeWidth="1.2"/>
   <path d="M43 51 Q50 45 57 51" fill="none" stroke="#B18A4B" strokeOpacity=".9" strokeWidth="1.5" strokeLinecap="round"/>
   <ellipse cx="50" cy="39" rx="11" ry="12" fill="url(#spidy-shell)" stroke="#B18A4B" strokeWidth="1.2"/>
   <circle cx="46" cy="36" r="2.3" fill="#E8CF9D"/>
   <circle cx="54" cy="36" r="2.3" fill="#E8CF9D"/>
   <circle cx="46.5" cy="36" r="1" fill="#17110e"/>
   <circle cx="54.5" cy="36" r="1" fill="#17110e"/>
  </svg>
  <div className="spider-intro-signature" aria-hidden="true">A LITTLE WEB OF HAPPINESS</div>
  <button type="button" autoFocus className="spider-intro-skip" onClick={onSkip}>Skip intro <ArrowRight size={15}/></button>
 </div>;
}


export default function App(){
 const [page,setPage]=useState(()=>{const path=window.location.pathname.replace(/\/+$/,'')||'/';return routeToPage[path]||(path==='/admin'?'owner':'not-found')}),[introPlaying,setIntroPlaying]=useState(()=>{try{return window.location.pathname==='/'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.sessionStorage.getItem('spidy-intro-seen')!=='1'}catch{return false}}),[kind,setKind]=useState(()=>{try{return window.localStorage.getItem('spidy_order_type')==='delivery'?'delivery':'pickup'}catch{return 'pickup'}}),[cart,setCart]=useState([]),[tiramisuSize,setTiramisuSize]=useState('300'),[customer,setCustomer]=useState(emptyCustomer),[notice,setNotice]=useState(()=>{try{const r=JSON.parse(window.localStorage.getItem('spidy_payment_review')||'null');return r?'Payment for order '+r.order_reference+' still needs verification. Do not pay again. Payment ID: '+r.payment_id+'. Contact Spidy Sells.':''}catch{return ''}}),[busy,setBusy]=useState(false),[orderRef,setOrderRef]=useState(''),[paymentMethod,setPaymentMethod]=useState('cash_on_pickup'),[orderDetails,setOrderDetails]=useState(null),[activeOrder,setActiveOrder]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('spidy_active_order')||'null')}catch{return null}});
 const [paymentPendingReview,setPaymentPendingReview]=useState(()=>{try{return Boolean(window.localStorage.getItem('spidy_payment_review'))}catch{return false}});
 const [products,setProducts]=useState([]),[branches,setBranches]=useState([]),[stockByBranch,setStockByBranch]=useState({}),[stockLoaded,setStockLoaded]=useState(false),[stockSaving,setStockSaving]=useState({}),[settings,setSettings]=useState(defaultSettings),[selectedBranch,setSelectedBranch]=useState(()=>{try{return window.localStorage.getItem('spidy_selected_branch')||''}catch{return ''}}),[session,setSession]=useState(null),[tab,setTab]=useState('orders'),[orders,setOrders]=useState([]),[editingProduct,setEditingProduct]=useState(null),[editingBranch,setEditingBranch]=useState(null),[resetText,setResetText]=useState(''),[passwords,setPasswords]=useState({next:'',confirm:''}),[dashboardLoading,setDashboardLoading]=useState(false),[deliveryQuote,setDeliveryQuote]=useState(null),[quoteBusy,setQuoteBusy]=useState(false),[quoteError,setQuoteError]=useState(''),[deliveryLookupRequested,setDeliveryLookupRequested]=useState(false);
 const [customerOrderHistory,setCustomerOrderHistory]=useState([]),[customerHistoryLoading,setCustomerHistoryLoading]=useState(false),[customerHistorySearched,setCustomerHistorySearched]=useState(false),[customerHistoryMessage,setCustomerHistoryMessage]=useState('');
 const [historyReference,setHistoryReference]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('spidy_active_order')||'null')?.order_reference||''}catch{return ''}});
 const [historyPhone,setHistoryPhone]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('spidy_active_order')||'null')?.customer_phone||''}catch{return ''}});
 const [historySearchRequest,setHistorySearchRequest]=useState(0);
 const [reviews,setReviews]=useState([]),[reviewName,setReviewName]=useState(''),[reviewRating,setReviewRating]=useState(5),[reviewDescription,setReviewDescription]=useState(''),[reviewImage,setReviewImage]=useState(null),[reviewBusy,setReviewBusy]=useState(false),[reviewModalOpen,setReviewModalOpen]=useState(false);
 const [homeSlide,setHomeSlide]=useState(0),[bulkOrderOpen,setBulkOrderOpen]=useState(false),[bulkQuantity,setBulkQuantity]=useState('50'),[bulkEvent,setBulkEvent]=useState('Party'),[bulkName,setBulkName]=useState(''),[bulkPhone,setBulkPhone]=useState(''),[bulkCity,setBulkCity]=useState(''),[bulkDate,setBulkDate]=useState('');
 const total=useMemo(()=>cart.reduce((s,i)=>s+Number(i.price)*i.qty,0),[cart]);
 const matchingDeliveryQuote=kind==='delivery'&&deliveryQuote?.branchId===selectedBranch&&deliveryQuote?.address===customer.address.trim()?deliveryQuote:null;
 const deliveryFee=kind==='delivery'?Number(matchingDeliveryQuote?.deliveryCharge||0):0;
 const selectedBranchInfo=branches.find(branch=>branch.id===selectedBranch);
 const selectedCity=/howrah/i.test((selectedBranchInfo?.name||'')+' '+(selectedBranchInfo?.address||''))?'HOWRAH':'KOLKATA';
 const kolkataBranchInfo=branches.find(branch=>/park circus|kolkata/i.test((branch.name||'')+' '+(branch.address||'')));
 const howrahBranchInfo=branches.find(branch=>/howrah|bankra/i.test((branch.name||'')+' '+(branch.address||'')));
 useEffect(()=>{if(page!=='location')return;const timer=window.setInterval(()=>setHomeSlide(n=>(n+1)%3),5200);return()=>window.clearInterval(timer)},[page]);

 useEffect(()=>{
  if(!introPlaying)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){finishIntro();return}
  const timer=window.setTimeout(finishIntro,4000);
  return()=>window.clearTimeout(timer);
 },[introPlaying]);
 useEffect(()=>{try{if(selectedBranch)window.localStorage.setItem('spidy_selected_branch',selectedBranch);else window.localStorage.removeItem('spidy_selected_branch')}catch{}},[selectedBranch]);
 useEffect(()=>{try{window.localStorage.setItem('spidy_order_type',kind)}catch{}},[kind]);
 useEffect(()=>{
  if(!introPlaying)return;
  const onKeyDown=event=>{if(event.key==='Escape')finishIntro()};
  window.addEventListener('keydown',onKeyDown);
  return()=>window.removeEventListener('keydown',onKeyDown);
 },[introPlaying]);

 useEffect(()=>{if(!supabase)return;refreshPublic();supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)loadAdminData()});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s){setPage('admin');loadAdminData()}else if(page==='admin')setPage('location')});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{
  const metadata={
   location:{title:'Spidy Sells | Tiramisu & Dessert Orders in Kolkata and Howrah',description:'Discover Spidy Sells for rich, coffee-kissed tiramisu and dessert orders in Kolkata and Howrah. Choose a serving location to see available ordering options.'},
   type:{title:'Choose Takeaway or Delivery | Spidy Sells',description:'Choose an available Spidy Sells ordering option for your location in Kolkata or Howrah.'},
   menu:{title:'Dessert Menu | Spidy Sells',description:'Explore the full Spidy Sells dessert menu, choose your size and add favourites to your bag.'},
   reviews:{title:'Customer Reviews | Spidy Sells',description:'Read customer feedback about Spidy Sells desserts and orders.'},
   contact:{title:'Contact & Support | Spidy Sells',description:'Contact Spidy Sells by phone or WhatsApp, find our Kolkata and Howrah locations, and get order support.'},
   about:{title:'About Spidy Sells | Our Story',description:'Learn about Spidy Sells, our dessert-first approach and why customers choose us.'},
   cart:{title:'Your Dessert Bag | Spidy Sells',description:'Review the desserts in your Spidy Sells bag before checkout.'},
   checkout:{title:'Checkout | Spidy Sells',description:'Review your Spidy Sells order, pickup location or delivery details, and available payment method.'},
   success:{title:'Order Confirmation | Spidy Sells',description:'Review the details and status of your Spidy Sells order.'},
   history:{title:'Your Orders | Spidy Sells',description:'View the order history linked to your order reference and checkout phone number.'},
   owner:{title:'Owner Login | Spidy Sells',description:'Secure owner sign-in for the Spidy Sells store management dashboard.'},
   admin:{title:'Store Management | Spidy Sells',description:'Private Spidy Sells store management dashboard.'},
   'not-found':{title:'Page Not Found | Spidy Sells',description:'This Spidy Sells page could not be found. Return to the store homepage to continue.'}
  };
  const current=metadata[page]||metadata.location;
  const origin='https://www.spidysells.com';
  const route=pageToRoute[page]||null;
  document.title=current.title;
  const setMeta=(selector,attr,value,content)=>{let node=document.head.querySelector(selector);if(!node){node=document.createElement('meta');node.setAttribute(attr,value);document.head.appendChild(node)}node.setAttribute('content',content)};
  setMeta('meta[name="description"]','name','description',current.description);
  const indexablePage=['location','menu','reviews','contact','about'].includes(page);
  setMeta('meta[name="robots"]','name','robots',indexablePage?'index,follow,max-image-preview:large':'noindex,nofollow');
  setMeta('meta[property="og:title"]','property','og:title',current.title);
  setMeta('meta[property="og:description"]','property','og:description',current.description);
  setMeta('meta[property="og:url"]','property','og:url',route?origin+route:origin+'/');
  setMeta('meta[property="og:image"]','property','og:image',origin+'/og-spidy-sells.svg');
  setMeta('meta[property="og:image:alt"]','property','og:image:alt','Spidy Sells tiramisu and dessert ordering in Kolkata and Howrah');
  setMeta('meta[name="twitter:title"]','name','twitter:title',current.title);
  setMeta('meta[name="twitter:description"]','name','twitter:description',current.description);
  const canonical=document.head.querySelector('link[rel="canonical"]');
  if(!route){canonical?.remove()}else if(canonical){canonical.href=origin+route}else{const link=document.createElement('link');link.rel='canonical';link.href=origin+route;document.head.appendChild(link)}
 },[page]);
 useEffect(()=>{
  const active=branches.filter(branch=>branch.active&&branch.name&&branch.address);
  const node=document.getElementById('spidy-structured-data');
  if(!node)return;
  const origin='https://www.spidysells.com';
  const organization={'@type':'Organization','@id':origin+'/#organization','name':settings.business_name||'Spidy Sells','url':origin+'/', 'description':'Tiramisu and dessert ordering in Kolkata and Howrah, India.','logo':{'@type':'ImageObject','url':origin+'/favicon.svg'},'image':origin+'/og-spidy-sells.svg','areaServed':[{'@type':'City','name':'Kolkata'},{'@type':'City','name':'Howrah'}]};
  const website={'@type':'WebSite','@id':origin+'/#website','url':origin+'/','name':settings.business_name||'Spidy Sells','publisher':{'@id':origin+'/#organization'},'inLanguage':'en-IN'};
  const businesses=active.map((branch,index)=>{
   const placeText=(branch.name+' '+branch.address).toLowerCase();
   const locality=placeText.includes('howrah')?'Howrah':placeText.includes('kolkata')?'Kolkata':undefined;
   const postcode=branch.address.match(/\b\d{6}\b/)?.[0];
   const address={'@type':'PostalAddress',streetAddress:branch.address,addressRegion:'West Bengal',addressCountry:'IN'};
   if(locality)address.addressLocality=locality;
   if(postcode)address.postalCode=postcode;
   const item={'@type':'FoodEstablishment','@id':origin+'/#branch-'+encodeURIComponent(branch.id||branch.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')),'name':(settings.business_name||'Spidy Sells')+' - '+branch.name,'url':origin+'/','parentOrganization':{'@id':origin+'/#organization'},'servesCuisine':'Desserts','address':address};
   if(branch.contact_phone)item.telephone=branch.contact_phone;
   if(branch.google_maps_url)item.hasMap=branch.google_maps_url;
   return item;
  });
  node.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[organization,website,...businesses]});
 },[branches,settings.business_name]);

 useEffect(()=>{const target=pageToRoute[page];if(target&&window.location.pathname!==target)window.history.pushState({},'',target)},[page]);
 useEffect(()=>{
  if(page!=='history')return;
  let saved=null;
  try{saved=JSON.parse(window.sessionStorage.getItem('spidy-order-history-search')||'null')}catch{}
  if(!saved?.reference||!saved?.phone){
   setCustomerHistorySearched(false);
   setCustomerHistoryMessage('Enter your order reference and checkout phone number on the homepage, then choose View all orders.');
   return;
  }
  setHistoryReference(saved.reference);
  setHistoryPhone(saved.phone);
  loadCustomerOrderHistory(saved.reference,saved.phone,true);
 },[page,historySearchRequest]);

 useEffect(()=>{const onPopState=()=>{const path=window.location.pathname.replace(/\/+$/,'')||'/';setPage(path==='/admin'?(session?'admin':'owner'):(routeToPage[path]||'not-found'))};window.addEventListener('popstate',onPopState);return()=>window.removeEventListener('popstate',onPopState)},[session]);
 useEffect(()=>{
  if(page!=='checkout'||kind!=='delivery'){
   setQuoteBusy(false);setQuoteError('');setDeliveryQuote(null);setDeliveryLookupRequested(false);return;
  }
  const address=customer.address.trim();
  if(!deliveryLookupRequested||!selectedBranch||address.length<10){
   setDeliveryQuote(null);setQuoteBusy(false);setQuoteError('');return;
  }
  let cancelled=false;
  setDeliveryQuote(null);setQuoteBusy(true);setQuoteError('');
  const runQuote=async()=>{
   if(!supabase){if(!cancelled){setQuoteBusy(false);setQuoteError('Ordering is not connected yet.');}return;}
   const {data,error}=await supabase.functions.invoke('spidy-order-api',{body:{action:'quote',branchId:selectedBranch,address}});
   if(cancelled)return;
   setQuoteBusy(false);
   if(error||!data?.ok){setDeliveryQuote(null);setQuoteError(data?.message||error?.message||'Could not calculate the delivery charge. Please check the address or try again.');return;}
   setDeliveryQuote({...data,branchId:selectedBranch,address});
  };
  runQuote();
  return()=>{cancelled=true};
 },[page,kind,selectedBranch,customer.address,deliveryLookupRequested]);
 useEffect(()=>{
  if(!supabase||!activeOrder?.order_reference||!activeOrder?.customer_phone||['completed','cancelled'].includes(activeOrder?.status))return;
  let stopped=false;
  async function syncOrder(){
   const {data,error}=await supabase.rpc('get_customer_order_status',{p_order_reference:activeOrder.order_reference,p_customer_phone:activeOrder.customer_phone});
   if(stopped||error||!data)return;
   const merged={...activeOrder,...data,branch_id:activeOrder.branch_id||data.branch_id,branch_address:activeOrder.branch_address||data.branch_address,branch_name:activeOrder.branch_name||data.branch_name};
   setActiveOrder(merged);
   window.localStorage.setItem('spidy_active_order',JSON.stringify({order_reference:data.order_reference,customer_phone:data.customer_phone}));
   setOrderDetails(prev=>prev?.order_reference===data.order_reference?{...prev,...data,branch_id:prev.branch_id||data.branch_id,branch_address:prev.branch_address||data.branch_address,branch_name:prev.branch_name||data.branch_name}:prev);
  }
  syncOrder();
  const timer=window.setInterval(syncOrder,15000);
  return()=>{stopped=true;window.clearInterval(timer)};
 },[activeOrder?.order_reference,activeOrder?.customer_phone,activeOrder?.status]);
 useEffect(()=>{
  if(!activeOrder?.order_reference||!activeOrder?.customer_phone)return;
  setHistoryReference(activeOrder.order_reference);
  setHistoryPhone(activeOrder.customer_phone);
  loadCustomerOrderHistory(activeOrder.order_reference,activeOrder.customer_phone,false);
 },[activeOrder?.order_reference,activeOrder?.customer_phone]);
 async function refreshReviews(){if(!supabase)return;const {data,error}=await supabase.from('customer_reviews').select('*').order('created_at',{ascending:false}).limit(250);if(!error)setReviews(data||[])}
 async function submitReview(e){e.preventDefault();const form=e.currentTarget;if(!supabase)return;setReviewBusy(true);try{let imageUrl=null;if(reviewImage){if(!['image/jpeg','image/png','image/webp'].includes(reviewImage.type)||reviewImage.size>5*1024*1024)throw new Error('Use a JPG, PNG or WEBP image up to 5 MB.');const ext=reviewImage.type==='image/png'?'png':reviewImage.type==='image/webp'?'webp':'jpg';const path=crypto.randomUUID()+'.'+ext;const {error:ue}=await supabase.storage.from('customer-review-images').upload(path,reviewImage,{contentType:reviewImage.type,upsert:false});if(ue)throw ue;imageUrl=supabase.storage.from('customer-review-images').getPublicUrl(path).data.publicUrl}const {error}=await supabase.from('customer_reviews').insert({customer_name:reviewName.trim(),rating:reviewRating,description:reviewDescription.trim(),image_url:imageUrl});if(error)throw error;setReviewName('');setReviewRating(5);setReviewDescription('');setReviewImage(null);form.reset();setNotice('Thank you for sharing your review!');await refreshReviews()}catch(err){setNotice(err.message||'Could not submit review.')}finally{setReviewBusy(false)}}
 async function deleteReview(r){if(!window.confirm('Delete this review permanently?'))return;const {error}=await supabase.from('customer_reviews').delete().eq('id',r.id);if(error){setNotice(error.message);return}if(r.image_url){const path=r.image_url.split('/customer-review-images/')[1]?.split('?')[0];if(path)await supabase.storage.from('customer-review-images').remove([decodeURIComponent(path)])}setReviews(prev=>prev.filter(x=>x.id!==r.id))}
 async function refreshPublic(){
  if(!supabase)return;
  refreshReviews();
  setStockLoaded(false);
  const [pr,br,se,st]=await Promise.all([
   supabase.from('products').select('*').eq('published',true).eq('available',true).order('created_at'),
   supabase.from('branches').select('*').eq('active',true).order('name'),
   supabase.from('business_settings').select('*').limit(1).maybeSingle(),
   supabase.from('branch_product_stock').select('product_id,branch_id,status'),
   supabase.from('customer_reviews').select('*').order('created_at',{ascending:false}).limit(250)
  ]);
  if(!pr.error)setProducts(pr.data||[]);else setNotice('Menu database is not ready. Apply the Supabase migrations in README.');
  if(!br.error)setBranches(br.data||[]);
  if(!se.error&&se.data)setSettings({...defaultSettings,...se.data});
  if(st.error){
   setStockByBranch({});
   setStockLoaded(false);
   setNotice('Product stock could not be checked. Please refresh before placing an order.');
  }else{
   setStockByBranch(Object.fromEntries((st.data||[]).map(row=>[stockMapKey(row.product_id,row.branch_id),row.status])));
   setStockLoaded(true);
  }
 }
 async function loadAdminData(){
  if(!supabase)return;setDashboardLoading(true);setStockLoaded(false);
  const [o,p,b,s,st,rv]=await Promise.all([
   supabase.from('orders').select('*,branches(name),order_items(*)').order('created_at',{ascending:false}).limit(500),
   supabase.from('products').select('*').order('created_at',{ascending:false}),
   supabase.from('branches').select('*').order('created_at',{ascending:false}),
   supabase.from('business_settings').select('*').limit(1).maybeSingle(),
   supabase.from('branch_product_stock').select('product_id,branch_id,status')
  ]);
  if(o.error)setNotice('Orders: '+o.error.message);else setOrders(o.data||[]);if(!rv.error)setReviews(rv.data||[]);
  if(!p.error)setProducts(p.data||[]);
  if(!b.error)setBranches(b.data||[]);
  if(!s.error&&s.data)setSettings({...defaultSettings,...s.data});
  if(st.error){setStockByBranch({});setStockLoaded(false);setNotice('Stock settings could not be loaded: '+st.error.message);}
  else{setStockByBranch(Object.fromEntries((st.data||[]).map(row=>[stockMapKey(row.product_id,row.branch_id),row.status])));setStockLoaded(true);}
  setDashboardLoading(false);
 }
 async function loadCustomerOrderHistory(reference,phone,submitted=false){
  const cleanReference=String(reference||'').trim().toUpperCase();
  const cleanPhone=String(phone||'').trim();
  if(!cleanReference||!cleanPhone){
   if(submitted){setCustomerHistorySearched(true);setCustomerHistoryMessage('Enter an order reference and the phone number used at checkout.');}
   return;
  }
  if(!supabase){setCustomerHistoryMessage('Order history is not connected right now. Please try again later.');return;}
  setCustomerHistoryLoading(true);
  setCustomerHistoryMessage('');
  try{
   const {data,error}=await supabase.rpc('get_customer_order_history',{p_order_reference:cleanReference,p_customer_phone:cleanPhone});
   if(error)throw error;
   const history=Array.isArray(data)?data:[];
   setCustomerOrderHistory(history);
   setCustomerHistorySearched(true);
   if(submitted)setCustomerHistoryMessage(history.length?`Found ${history.length} order${history.length===1?'':'s'} for this phone number.`:'No matching orders found. Check the order reference and phone number, then try again.');
   else if(!history.length)setCustomerHistoryMessage('');
  }catch(error){
   setCustomerOrderHistory([]);
   setCustomerHistorySearched(true);
   setCustomerHistoryMessage(submitted?'We could not load your orders. Check the details and try again.':'Unable to refresh order history. Enter your order reference and phone number to try again.');
  }finally{
   setCustomerHistoryLoading(false);
  }
 }
 async function searchCustomerOrderHistory(e){
  e.preventDefault();
  const reference=String(historyReference||'').trim().toUpperCase();
  const phone=String(historyPhone||'').trim();
  if(!reference||!phone){setCustomerHistoryMessage('Enter an order reference and the phone number used at checkout.');return}
  try{window.sessionStorage.setItem('spidy-order-history-search',JSON.stringify({reference,phone}))}catch{}
  setCustomerOrderHistory([]);
  setCustomerHistorySearched(false);
  setCustomerHistoryMessage('');
  setPage('history');
  setHistorySearchRequest(request=>request+1);
 }
 function chooseLocation(city){const branch=city==='howrah'?branches.find(b=>/howrah|bankra/i.test((b.name||'')+' '+(b.address||''))):branches.find(b=>/kolkata|beniapukur|don bosco|700017/i.test((b.name||'')+' '+(b.address||'')));setSelectedBranch(branch?.id||'');setKind('pickup');setPaymentMethod('cash_on_pickup');setNotice('');setPage('type')}
 function selectCartBranch(branch){if(!branch)return;setSelectedBranch(branch.id);setKind('pickup');setPaymentMethod('cash_on_pickup');setNotice('Selected '+branch.name+'. Checking availability for this branch.');setPage(cart.length?'cart':'menu')}
 function submitBulkOrder(e){e.preventDefault();const qty=Math.max(50,Number(bulkQuantity)||50);const message=['Hi Spidy Sells! I would like to enquire about a bulk tiramisu order.','Event: '+bulkEvent,'Quantity: '+qty+' small tiramisu cups','Indicative price: ₹55 per cup','Estimated total: ₹'+(qty*55).toLocaleString('en-IN'),'Name: '+bulkName,'Phone: '+bulkPhone,'City / area: '+bulkCity,'Event date: '+(bulkDate||'To be confirmed')].join('\\n');window.open('https://wa.me/918910882074?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');setBulkOrderOpen(false)}
 function checkOtherLocation(product){
  if(!stockLoaded){setNotice('Please wait while we check stock at other locations.');return}
  const compatibleBranches=branches.filter(branch=>branch.active&&branch.id!==selectedBranch&&(kind==='pickup'?branch.takeaway_enabled:(settings.delivery_enabled&&branch.delivery_enabled))&&stockByBranch[stockMapKey(product.id,branch.id)]==='in_stock');
  if(!compatibleBranches.length){
   setNotice('This product is not currently in stock at another location that supports your selected order type.');
   return;
  }
  const requiredProductIds=[...new Set([...cart.map(item=>item.id),product.id])];
  const branch=compatibleBranches.find(candidate=>requiredProductIds.every(id=>stockByBranch[stockMapKey(id,candidate.id)]==='in_stock'))||compatibleBranches[0];
  setSelectedBranch(branch.id);
  setNotice('Switched to '+branch.name+'. Your '+(kind==='pickup'?'takeaway':'delivery')+' order can continue here.');
  setPage('menu');
 }
 function add(item,variantMl=null){const isTiramisu=item.id==='11111111-1111-4111-8111-111111111111';const size=isTiramisu?String(variantMl||'300'):null;const price=isTiramisu?(size==='200'?99:130):Number(item.price);const cartKey=`${item.id}-${size||'default'}`;const cartItem={...item,cartKey,variant_ml:size,price,name:isTiramisu?`${item.name} (${size} ml)`:item.name};setCart(old=>{const x=old.find(i=>i.cartKey===cartKey);return x?old.map(i=>i.cartKey===cartKey?{...i,qty:i.qty+1}:i):[...old,{...cartItem,qty:1}]});setNotice('Added to your bag');}
 function changeQty(cartKey,delta){setCart(old=>old.map(i=>(i.cartKey||`${i.id}-default`)===cartKey?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0))}
 async function checkout(e){
  e.preventDefault();setNotice('');
  if(paymentPendingReview){setNotice('A recent payment still needs verification. Please do not pay again; contact the store with the payment reference shown.');return}
  if(!cart.length){setNotice('Your bag is empty. Add a dessert first.');return}
  if(!customer.name.trim()||!/^\+?[0-9\s()-]{8,15}$/.test(customer.phone.trim())||(kind==='delivery'&&!customer.address.trim())){setNotice('Please enter your name, a valid phone number, and delivery address if needed.');return}
  if(!selectedBranch){setNotice('Please choose Kolkata or Howrah before placing your order.');return}
  const chosenBranch=branches.find(b=>b.id===selectedBranch);
  if(!chosenBranch||!chosenBranch.active){setNotice('This store location is unavailable. Please go back and choose a location again.');return}
  if(!stockLoaded){setNotice('We are checking product stock. Please wait a moment and try again.');return}
  const outOfStockItem=cart.find(item=>stockByBranch[stockMapKey(item.id,selectedBranch)]!=='in_stock');
  if(outOfStockItem){setNotice(outOfStockItem.name+' is out of stock at '+chosenBranch.name+'. Please check other location to order.');setPage('menu');return}
  if(kind==='pickup'&&!chosenBranch.takeaway_enabled){setNotice('Takeaway is not available at this location.');return}
  if(kind==='delivery'&&(!settings.delivery_enabled||!chosenBranch.delivery_enabled)){setNotice('Delivery is not available at this location yet.');return}
  if(!supabase){setNotice('Ordering is not connected yet. Configure Supabase before accepting real orders.');return}
  if(kind==='delivery'&&!settings.delivery_enabled){setNotice('Online delivery is not enabled yet. Please choose takeaway.');return}
  if(kind==='delivery'&&!matchingDeliveryQuote){setNotice(quoteError||(quoteBusy?'Please wait while we calculate the delivery charge.':'Enter your full delivery address so we can calculate the delivery charge.'));return}
  if(kind==='delivery'&&paymentMethod!=='online'){setPaymentMethod('online');setNotice('Online delivery orders require online payment. Cash on delivery is not available at any branch.');return}
  setBusy(true);
  let razorpayModalOpen=false;
  try{
   const isOnlinePayment=paymentMethod==='online';
   if(isOnlinePayment)await loadRazorpayCheckout();
   const {data,error}=await supabase.functions.invoke('spidy-order-api',{body:{action:'place_order',kind,branchId:selectedBranch,name:customer.name.trim(),phone:customer.phone.trim(),address:kind==='delivery'?customer.address.trim():null,notes:customer.notes.trim()||null,items:cart.map(i=>({product_id:i.id,quantity:i.qty,...(i.variant_ml?{variant_ml:i.variant_ml}:{})})),paymentMethod:isOnlinePayment?'online':'cash_on_pickup'}});
   if(error)throw new Error(await functionErrorMessage(error));
   if(!data?.ok)throw new Error(data?.message||'We could not record this order. Please retry.');
   const ref=data.order_reference||data.id;
   const itemSnapshot=cart.map(i=>({product_id:i.id,product_name_snapshot:i.name,quantity:i.qty,unit_price:i.price,line_total:i.price*i.qty}));
   if(isOnlinePayment){
    if(!window.Razorpay||!data.razorpay_key_id||!data.razorpay_order_id||!data.razorpay_amount){throw new Error('Razorpay did not return a complete payment order. Please contact the store before trying again.')}
    let paymentHandlerStarted=false;
    const gateway=new window.Razorpay({
     key:data.razorpay_key_id,
     amount:data.razorpay_amount,
     currency:data.razorpay_currency||'INR',
     name:'Spidy Sells',
     image:spidySellsLogo,
     description:'Dessert order '+ref,
     order_id:data.razorpay_order_id,
     prefill:{name:customer.name.trim(),contact:customer.phone.trim()},
     notes:{order_reference:ref},
     theme:{color:'#B18A4B'},
     modal:{ondismiss:()=>{
      razorpayModalOpen=false;
      if(!paymentHandlerStarted){setBusy(false);setNotice('Payment window closed. Your order is not confirmed yet; choose Place order when you are ready to try again.')}
     }},
     handler:async response=>{
      paymentHandlerStarted=true;
      setBusy(true);setNotice('');
      try{
       const {data:verified,error:verifyError}=await supabase.functions.invoke('spidy-order-api',{body:{action:'verify_razorpay_payment',razorpay_order_id:response.razorpay_order_id,razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature}});
       if(verifyError)throw verifyError;
       if(!verified?.ok)throw new Error(verified?.message||'Razorpay has not confirmed the payment yet.');
       const placed={...data,...verified,customer_phone:customer.phone.trim(),customer_name:customer.name.trim(),order_type:kind==='pickup'?'TAKEAWAY':'ONLINE DELIVERY',delivery_address:kind==='delivery'?customer.address.trim():null,branch_id:selectedBranch,branch_name:branches.find(b=>b.id===selectedBranch)?.name||'Selected location',branch_address:branches.find(b=>b.id===selectedBranch)?.address||'',items:itemSnapshot,status:'confirmed',payment_method:'online',payment_status:'paid'};
       setOrderRef(ref);setOrderDetails(placed);setActiveOrder(placed);window.localStorage.setItem('spidy_active_order',JSON.stringify({order_reference:ref,customer_phone:customer.phone.trim()}));setPage('success');setNotice('');setCart([]);setPaymentPendingReview(false);try{window.localStorage.removeItem('spidy_payment_review')}catch{}
      }catch(verificationError){
       setPaymentPendingReview(true);
       try{window.localStorage.setItem('spidy_payment_review',JSON.stringify({order_reference:ref,payment_id:response.razorpay_payment_id||'unknown',created_at:new Date().toISOString()}))}catch{}
       setNotice('Payment for order '+ref+' could not be verified automatically. Do not pay again yet. Keep payment ID '+(response.razorpay_payment_id||'from Razorpay checkout')+' and contact Spidy Sells.');
      }finally{setBusy(false)}
     }
    });
    gateway.on('payment.failed',response=>{
     if(paymentHandlerStarted)return;
     razorpayModalOpen=false;
     setBusy(false);
     setNotice(response?.error?.description||'The payment was not completed. If your bank shows a debit, please contact the store before trying again.');
    });
    razorpayModalOpen=true;
    gateway.open();
    return;
   }
   const placed={...data,customer_phone:customer.phone.trim(),customer_name:customer.name.trim(),order_type:kind==='pickup'?'TAKEAWAY':'ONLINE DELIVERY',delivery_address:kind==='delivery'?customer.address.trim():null,branch_id:selectedBranch,branch_name:branches.find(b=>b.id===selectedBranch)?.name||'Selected location',branch_address:branches.find(b=>b.id===selectedBranch)?.address||'',items:data.items||itemSnapshot,status:data.status||'confirmed',payment_method:kind==='pickup'?'cash_on_pickup':'online',payment_status:data.payment_status||'pending'};
   setOrderRef(ref);setOrderDetails(placed);setActiveOrder(placed);window.localStorage.setItem('spidy_active_order',JSON.stringify({order_reference:ref,customer_phone:customer.phone.trim()}));setPage('success');setNotice('');setCart([]);
  }catch(err){setNotice(err.message||'We could not record this order. Please retry.')}finally{if(!razorpayModalOpen)setBusy(false)}
 }
 async function login(e){e.preventDefault();if(!supabase){setNotice('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');return}setBusy(true);const email=e.currentTarget.email.value.trim();const {data,error}=await supabase.auth.signInWithPassword({email,password:e.currentTarget.password.value});if(error){setBusy(false);setNotice(error.message);return}const {data:admin,error:adminError}=await supabase.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();if(adminError||!admin){await supabase.auth.signOut();setBusy(false);setNotice('This account is not approved for the admin panel yet.');return}setBusy(false);setNotice('');setSession(data.session);setPage('admin');await loadAdminData()}
 async function logout(){await supabase?.auth.signOut();setSession(null);setPage('location')}
 async function updateStatus(order,status){const update={status,updated_at:new Date().toISOString()};if(status==='completed')update.payment_status='paid';const {error}=await supabase.from('orders').update(update).eq('id',order.id);if(error)setNotice(error.message);else{await supabase.from('order_status_history').insert({order_id:order.id,old_status:order.status,new_status:status,changed_by:session?.user?.id});await supabase.from('audit_events').insert({actor_id:session?.user?.id,action:'order_status_changed',details:{order_reference:order.order_reference,from:order.status,to:status}});await loadAdminData()}}
 async function setBranchProductStock(product,branch,status){
  const key=stockMapKey(product.id,branch.id);
  setStockSaving(prev=>({...prev,[key]:true}));
  try{
   const {error}=await supabase.from('branch_product_stock').upsert({
    product_id:product.id,
    branch_id:branch.id,
    status,
    updated_at:new Date().toISOString()
   },{onConflict:'product_id,branch_id'});
   if(error)throw error;
   setStockByBranch(prev=>({...prev,[key]:status}));
   setNotice(product.name+' marked '+(status==='in_stock'?'In-stock':'Out of stock')+' at '+branch.name+'.');
  }catch(error){
   setNotice('Could not update stock for '+product.name+' at '+branch.name+': '+(error.message||'Please try again.'));
  }finally{
   setStockSaving(prev=>({...prev,[key]:false}));
  }
 }
 async function saveProduct(e){e.preventDefault();const f=new FormData(e.currentTarget);const row={name:String(f.get('name')).trim(),description:String(f.get('description')).trim(),price:Number(f.get('price')),image_url:String(f.get('image_url')).trim()||null,published:f.get('published')==='on',available:f.get('available')==='on',updated_at:new Date().toISOString()};if(!row.name||row.price<0){setNotice('Enter a product name and valid price.');return}const result=editingProduct?.id?await supabase.from('products').update(row).eq('id',editingProduct.id):await supabase.from('products').insert(row);if(result.error)setNotice(result.error.message);else{setNotice('Product saved.');setEditingProduct(null);await loadAdminData()}}
 async function deleteProduct(p){if(!window.confirm('Remove '+p.name+' from the menu? Existing order records will be retained.'))return;const {error}=await supabase.from('products').delete().eq('id',p.id);if(error)setNotice(error.message);else await loadAdminData()}
 async function saveBranch(e){e.preventDefault();const f=new FormData(e.currentTarget);const row={name:String(f.get('name')).trim(),address:String(f.get('address')).trim(),contact_phone:String(f.get('contact_phone')).trim(),google_maps_url:String(f.get('google_maps_url')).trim()||null,opening_hours:String(f.get('opening_hours')||'').trim()||defaultOpeningHours,active:f.get('active')==='on',takeaway_enabled:f.get('takeaway_enabled')==='on',delivery_enabled:f.get('delivery_enabled')==='on',updated_at:new Date().toISOString()};if(!row.name||!row.address){setNotice('Branch name and address are required.');return}const result=editingBranch?.id?await supabase.from('branches').update(row).eq('id',editingBranch.id):await supabase.from('branches').insert(row);if(result.error)setNotice(result.error.message);else{setNotice('Branch saved.');setEditingBranch(null);await loadAdminData()}}
 async function deleteBranch(b){if(!window.confirm('Remove branch '+b.name+'? Existing orders will retain their recorded branch name.'))return;const {error}=await supabase.from('branches').delete().eq('id',b.id);if(error)setNotice(error.message);else await loadAdminData()}
 async function saveSettings(e){e.preventDefault();const f=new FormData(e.currentTarget);const row={business_name:String(f.get('business_name')).trim(),whatsapp_number:String(f.get('whatsapp_number')).replace(/[^0-9]/g,''),delivery_enabled:f.get('delivery_enabled')==='on',delivery_charge:Number(f.get('delivery_charge')||0),pickup_instructions:String(f.get('pickup_instructions')).trim(),updated_at:new Date().toISOString()};if(row.whatsapp_number.length<10){setNotice('Enter the WhatsApp number including country code.');return}let result;if(settings.id)result=await supabase.from('business_settings').update(row).eq('id',settings.id);else result=await supabase.from('business_settings').insert(row);if(result.error)setNotice(result.error.message);else{setNotice('Settings saved.');await loadAdminData()}}
 async function changePassword(e){e.preventDefault();if(passwords.next.length<10){setNotice('Use at least 10 characters for the new password.');return}if(passwords.next!==passwords.confirm){setNotice('The passwords do not match.');return}const {error}=await supabase.auth.updateUser({password:passwords.next});if(error)setNotice(error.message);else{setNotice('Password updated successfully.');setPasswords({next:'',confirm:''});e.currentTarget.reset()}}
 async function resetOrders(e){e.preventDefault();if(resetText!=='RESET ALL ORDERS'){setNotice('Type RESET ALL ORDERS exactly to continue.');return}if(!window.confirm('This permanently deletes all order records and their items. Continue?'))return;const {data,error}=await supabase.rpc('admin_reset_orders',{p_confirmation:resetText});if(error)setNotice(error.message);else{setNotice('Reset complete. '+data+' orders deleted.');setResetText('');await loadAdminData()}}
 function printReceipt(order){
  if(!order){setNotice('Order details are unavailable for this receipt.');return}
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const items=Array.isArray(order.items)?order.items:(Array.isArray(order.order_items)?order.order_items:[]);
  const amount=value=>rupees(value);
  const total=Number(order.total||0);
  const subtotal=Number(order.subtotal??total);
  const delivery=Number(order.delivery_charge||0);
  const paymentMethod=order.payment_method==='online'?'Online payment (Razorpay)':order.payment_method==='cash_on_pickup'?'Pay at takeaway':'Not specified';
  const paymentStatus=pretty(order.payment_status||'pending');
  const itemRows=items.map(item=>{
   const name=item.product_name_snapshot||item.name||'Item';
   const qty=Number(item.quantity||item.qty||1);
   const line=Number(item.line_total??Number(item.unit_price||item.price||0)*qty);
   return '<div class="item"><div class="item-name">'+esc(name)+' <span>× '+qty+'</span></div><div class="item-price">'+esc(amount(line))+'</div></div>';
  }).join('');
  const receiptWindow=window.open('','_blank','width=420,height=760');
  if(!receiptWindow){setNotice('Your browser blocked the receipt window. Allow pop-ups for this site and try again.');return}
  receiptWindow.document.open();
  receiptWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt '+esc(order.order_reference||'Spidy Sells')+'</title><style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#171717;font-family:Arial,Helvetica,sans-serif;font-size:11px}.receipt{width:72mm;max-width:100%;margin:0 auto;padding:5mm 3mm 7mm}.center{text-align:center}.brand{font-size:20px;font-weight:900;letter-spacing:1.5px;margin:0 0 3px}.tag{font-size:9px;letter-spacing:1.3px;margin-bottom:9px}.muted{color:#555}.rule{border:0;border-top:1px dashed #555;margin:9px 0}.row{display:flex;justify-content:space-between;gap:8px;margin:4px 0;align-items:flex-start}.row span:first-child{color:#444}.row b{text-align:right;overflow-wrap:anywhere}.item{display:flex;justify-content:space-between;gap:8px;margin:7px 0}.item-name{flex:1;overflow-wrap:anywhere}.item-name span{white-space:nowrap}.item-price{white-space:nowrap;text-align:right}.total{font-size:14px;font-weight:800;margin-top:7px}.status{font-weight:800;text-transform:uppercase}.small{font-size:9px;line-height:1.5}.thanks{font-weight:700;margin-top:12px}.print-action{display:block;margin:12px auto 18px;padding:9px 14px;border:0;background:#222;color:#fff;font-size:12px}@media print{@page{size:80mm auto;margin:0}html,body{width:80mm;margin:0!important;padding:0!important}.receipt{width:72mm;max-width:none;margin:0 auto;padding:4mm 3mm}.print-action{display:none}}@media screen{body{background:#f1f1f1}.receipt{background:white;min-height:100vh}.print-action{cursor:pointer}}</style></head><body><button class="print-action" onclick="window.print()">Print receipt / Save as PDF</button><main class="receipt"><header class="center"><h1 class="brand">SPIDY SELLS</h1><div class="tag">GOOD FOOD · GREAT MOOD</div><div class="small muted">'+esc(order.branch_name||'Spidy Sells')+'</div>'+(order.branch_address?'<div class="small muted">'+esc(order.branch_address)+'</div>':'')+'</header><hr class="rule"><div class="row"><span>Receipt / Order</span><b>'+esc(order.order_reference||'—')+'</b></div><div class="row"><span>Date</span><b>'+esc(order.created_at?new Date(order.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'))+'</b></div><div class="row"><span>Customer</span><b>'+esc(order.customer_name||'Customer')+'</b></div>'+(order.customer_phone?'<div class="row"><span>Phone</span><b>'+esc(order.customer_phone)+'</b></div>':'')+'<div class="row"><span>Order type</span><b>'+esc(order.order_type==='TAKEAWAY'?'Takeaway':'Online delivery')+'</b></div>'+(order.delivery_address?'<div class="row"><span>Deliver to</span><b>'+esc(order.delivery_address)+'</b></div>':'')+'<hr class="rule"><div class="row"><b>ITEM</b><b>AMOUNT</b></div>'+(itemRows||'<div class="small muted">Item details unavailable</div>')+'<hr class="rule"><div class="row"><span>Subtotal</span><b>'+esc(amount(subtotal))+'</b></div>'+(delivery>0?'<div class="row"><span>Delivery charge</span><b>'+esc(amount(delivery))+'</b></div>':'')+'<div class="row total"><span>TOTAL</span><b>'+esc(amount(total))+'</b></div><hr class="rule"><div class="row"><span>Order status</span><b class="status">'+esc(pretty(order.status||'confirmed'))+'</b></div><div class="row"><span>Payment method</span><b>'+esc(paymentMethod)+'</b></div><div class="row"><span>Payment status</span><b class="status">'+esc(paymentStatus)+'</b></div><hr class="rule"><footer class="center"><div class="thanks">Thank you for choosing Spidy Sells!</div><div class="small muted">Please keep this receipt for your records.</div></footer></main><script>window.addEventListener("load",()=>{setTimeout(()=>window.print(),250)})</script></body></html>');
  receiptWindow.document.close();
 }
 function finishIntro(){try{window.sessionStorage.setItem('spidy-intro-seen','1')}catch{}setIntroPlaying(false)}
 const completedSales=orders.filter(o=>o.status==='completed').reduce((s,o)=>s+Number(o.total||0),0);
 const converted=orders.filter(o=>['confirmed','preparing','ready_for_pickup','out_for_delivery','completed'].includes(o.status)).length;
 const unconverted=orders.filter(o=>['not_converted','cancelled'].includes(o.status)).length;
 const breadcrumbMap={
  type:[{label:'Home',target:'location'},{label:'Order type'}],
  menu:[{label:'Home',target:'location'},{label:'Products'}],
  reviews:[{label:'Home',target:'location'},{label:'Customer reviews'}],
  contact:[{label:'Home',target:'location'},{label:'Contact & support'}],
  about:[{label:'Home',target:'location'},{label:'About us'}],
  cart:[{label:'Home',target:'location'},{label:'Menu',target:'menu'},{label:'Bag'}],
  checkout:[{label:'Home',target:'location'},{label:'Menu',target:'menu'},{label:'Bag',target:'cart'},{label:'Checkout'}],
  success:[{label:'Home',target:'location'},{label:'Order confirmation'}],
  history:[{label:'Home',target:'location'},{label:'Your orders'}],
  owner:[{label:'Home',target:'location'},{label:'Owner login'}],
  admin:[{label:'Home',target:'location'},{label:'Owner dashboard'}]
 };
 const breadcrumbs=breadcrumbMap[page]||[];
 const storefrontProducts=products.filter(p=>p.published!==false&&p.available!==false);
 const bulkEstimate=Math.max(50,Number(bulkQuantity)||50)*55;
 const classicTiramisuProduct=storefrontProducts.find(p=>String(p.name||'').toLowerCase().includes('classic tiramisu'));
 const heroSlides=[{title:'A little cup of',accent:'mischief.',copy:'Coffee-kissed layers, cloud-soft cream and a cocoa finish. Your next sweet obsession is only a few clicks away.',image:classicTiramisuProduct?.image_url||'https://images.pexels.com/photos/31555082/pexels-photo-31555082.jpeg?auto=compress&cs=tinysrgb&w=1800',alt:'Classic Tiramisu from Spidy Sells'},{title:'Big on layers.',accent:'Bigger on joy.',copy:'Meet your new favourite dessert, carefully layered for every little celebration.',image:'https://images.pexels.com/photos/29460805/pexels-photo-29460805.jpeg?auto=compress&cs=tinysrgb&w=1800',alt:'Classic tiramisu dessert'},{title:'Your cravings called.',accent:'We answered.',copy:'From an after-meal treat to a party full of desserts, Spidy Sells brings the good stuff.',image:'https://images.pexels.com/photos/12035685/pexels-photo-12035685.jpeg?auto=compress&cs=tinysrgb&w=1800',alt:'Tiramisu served on a plate'}];
 const currentHero=heroSlides[homeSlide%heroSlides.length];
 return <div className="site"><div className="site-content" inert={introPlaying ? '' : undefined} aria-hidden={introPlaying || undefined}>
 <header className="header"><a className="brand" href="/" onClick={e=>{e.preventDefault();setPage('location')}} aria-label="Spidy Sells home"><img className="brand-logo" src={spidySellsLogo} alt="Spidy Sells logo" /></a><div className="header-motto" aria-label="With great taste, comes great responsibilities."><div className="motto-eyebrow"><span className="motto-rule" aria-hidden="true"/><span>THE SPIDY STANDARD</span><span className="motto-rule" aria-hidden="true"/></div><p className="motto-line">With great taste, comes <em>great responsibilities.</em></p><span className="motto-star" aria-hidden="true">✦</span></div><div className="header-right"><div className="header-socials" aria-label="Spidy Sells social media">
 <a className="header-social-link instagram-link" href="https://www.instagram.com/spidy_sells?xtok=b3Y1cmpvZG1iemZi&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Spidy Sells on Instagram" title="Instagram">
  <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="spidy-instagram-header" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#feda75"/><stop offset=".34" stopColor="#fa7e1e"/><stop offset=".62" stopColor="#d62976"/><stop offset=".82" stopColor="#962fbf"/><stop offset="1" stopColor="#4f5bd5"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="url(#spidy-instagram-header)"/><rect x="6.5" y="6.5" width="11" height="11" rx="3.3" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.3" cy="6.9" r="1.1" fill="#fff"/></svg>
 </a>
 <a className="header-social-link facebook-link" href="https://www.facebook.com/share/1C9pUYo87k/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Spidy Sells on Facebook" title="Facebook">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M13.4 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6v2H6.8v3.2h2.9V21h3.7Z"/></svg>
 </a>
 <a className="header-social-link whatsapp-link" href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer" aria-label="Chat with Spidy Sells on WhatsApp" title="WhatsApp">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#25D366"/><path fill="#fff" d="M17.25 14.65c-.28-.14-1.65-.82-1.91-.91-.26-.1-.44-.14-.63.14-.19.28-.72.91-.88 1.09-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.24-1.37-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.12-.12.28-.33.42-.49.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.63-1.51-.86-2.07-.23-.54-.46-.47-.63-.48h-.54c-.19 0-.49.07-.75.35-.26.28-.98.96-.98 2.33s1 2.7 1.14 2.89c.14.19 1.97 3.01 4.77 4.22.67.29 1.19.47 1.6.6.67.21 1.28.18 1.76.11.54-.08 1.65-.68 1.88-1.34.23-.66.23-1.23.16-1.34-.07-.12-.26-.19-.54-.33Z"/></svg>
 </a>
</div>{['location','menu','cart','checkout'].includes(page)&&<button className="bag" onClick={()=>setPage('cart')}><ShoppingBag size={17}/> Bag <i>{cart.reduce((s,i)=>s+i.qty,0)}</i></button>}{page==='admin'&&<button className="owner" onClick={logout}><LogOut size={14} style={{verticalAlign:'middle'}}/> Log out</button>}</div></header>
 {!['admin','owner'].includes(page)&&<nav className="store-nav" aria-label="Main navigation"><a href="/" onClick={e=>{e.preventDefault();setPage('location')}}>Home</a><a href="/products" onClick={e=>{e.preventDefault();setPage('menu')}}>Products</a><a href="/about" onClick={e=>{e.preventDefault();setPage('about')}}>About us</a><a href="/reviews" onClick={e=>{e.preventDefault();setPage('reviews')}}>Reviews</a><a href="/contact" onClick={e=>{e.preventDefault();setPage('contact')}}>Contact</a><a href="/orders" onClick={e=>{e.preventDefault();setPage('history')}}>Track order</a><button onClick={()=>setBulkOrderOpen(true)}>Bulk orders <span>?</span></button></nav>}
 {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
 {breadcrumbs.length>0&&<nav className="breadcrumbs" aria-label="Breadcrumb"><ol>{breadcrumbs.map((crumb,index)=><li key={crumb.label} aria-current={index===breadcrumbs.length-1?'page':undefined}>{crumb.target?<a href={pageToRoute[crumb.target]||'/'} onClick={e=>{e.preventDefault();setPage(crumb.target)}}>{crumb.label}</a>:<span>{crumb.label}</span>}</li>)}</ol></nav>}
 {page==='not-found'&&<main className="content narrow page-not-found"><div className="kicker">ERROR 404</div><h1>This page has<br/><em>gone missing.</em></h1><p className="lead">The link may be old, or the page may have moved. Let’s get you back to the Spidy Sells store.</p><a className="primary" href="/" onClick={e=>{e.preventDefault();window.history.pushState({},'','/');setPage('location')}}>Back to the store <ArrowRight size={16}/></a></main>}
 {page==='location'&&<main className="spider-home">
 <section className="spider-hero"><div className="spider-hero-web" aria-hidden="true"/>
  <div className="spider-hero-copy"><div className="spider-kicker"><i/> THE FRIENDLY NEIGHBOURHOOD DESSERT</div><h1>{currentHero.title}<br/><em>{currentHero.accent}</em></h1><p>{currentHero.copy}</p><div className="spider-hero-actions"><button className="spider-primary" onClick={()=>setPage('menu')}>Explore desserts <ArrowRight size={17}/></button><button className="spider-secondary" onClick={()=>setBulkOrderOpen(true)}>Planning an event? <b>Bulk orders</b></button></div><div className="spider-hero-meta"><span>✦ Kolkata &amp; Howrah</span><span>✦ Made for sweet moments</span></div></div>
  <div className="spider-hero-visual"><div className="spider-food-frame"><img key={currentHero.image} src={currentHero.image} alt={currentHero.alt} fetchPriority="high"/><span className="food-sticker">SPIDY<br/>FAVOURITE</span></div><div className="spider-mask" aria-hidden="true"><svg viewBox="0 0 220 240"><path d="M110 8C77 15 43 34 25 69c5 70 31 126 85 161 54-35 80-91 85-161C177 34 143 15 110 8Z" fill="#e51c39" stroke="#ff7484" strokeWidth="5"/><g fill="none" stroke="#171116" strokeWidth="3"><path d="M110 5V232M25 69L195 169M25 169L195 69M22 110L198 130M45 35Q110 89 175 35M30 82Q110 128 190 82M33 145Q110 184 187 145M49 190Q110 150 171 190"/></g><path d="M44 95Q73 73 98 100Q89 132 62 144Q42 127 44 95Z M176 95Q147 73 122 100Q131 132 158 144Q178 127 176 95Z" fill="#fff" stroke="#171116" strokeWidth="7"/></svg></div></div>
  <div className="spider-slider"><span>0{homeSlide+1} <i/> 03</span><div>{heroSlides.map((s,i)=><button key={s.image} className={homeSlide===i?'selected':''} onClick={()=>setHomeSlide(i)} aria-label={'Show slide '+(i+1)}/>)}</div><small>A SWEET LITTLE ADVENTURE</small></div>
 </section>
 <div className="spider-promise"><span><b>01</b> Layers worth slowing down for</span><span><b>02</b> Made for little celebrations</span><span><b>03</b> Kolkata &amp; Howrah ordering</span></div>
 <section className="spider-section" id="home-products"><div className="spider-section-title"><div><div className="spider-kicker"><i/> THE SWEET LINE-UP</div><h2>Meet the <em>cravings.</em></h2><p>Pick your favourite, add it to your bag, and choose your branch when you are ready.</p></div><button className="spider-text-link" onClick={()=>setPage('menu')}>View all products <ArrowRight size={16}/></button></div>
 {branches.length>0&&<div className="spider-branch-hours" aria-label="Branch opening hours">{branches.filter(branch=>branch.active!==false).map(branch=><article className="spider-branch-hours-card" key={branch.id}><div className="spider-branch-hours-top"><span className="spider-branch-pin"><MapPin size={16}/></span><span className="spider-branch-label">{branch.name}</span><span className="spider-branch-open">BRANCH HOURS</span></div>{branch.address&&<p className="spider-branch-address">{branch.address}</p>}<div className="spider-branch-hours-line"><Clock3 size={16}/><span>{branch.opening_hours||defaultOpeningHours}</span></div></article>)}</div>}
 <div className="spider-product-grid">{storefrontProducts.slice(0,6).map(p=>{const status=!selectedBranch?'choose_branch':stockLoaded?(stockByBranch[stockMapKey(p.id,selectedBranch)]||'out_of_stock'):'loading';const canAdd=!selectedBranch||status==='in_stock';return <article className="spider-product-card" key={p.id}><div className="spider-product-photo">{p.image_url?<img src={p.image_url} alt={p.name+' dessert'} loading="lazy"/>:<img src={heroSlides[0].image} alt={p.name+' dessert'} loading="lazy"/>}<span>THE SPIDY PICK</span></div><div className="spider-product-info"><div className="spider-product-heading"><h3>{p.name}</h3><b>{p.id==='11111111-1111-4111-8111-111111111111'?'₹99–₹130':rupees(p.price)}</b></div><p>{p.description}</p>{p.id==='11111111-1111-4111-8111-111111111111'&&<label className="spider-size-picker">Choose size<select value={tiramisuSize} onChange={e=>setTiramisuSize(e.target.value)}><option value="300">300 ml · ₹130</option><option value="200">200 ml · ₹99</option></select></label>}<div className={'spider-stock '+(status==='choose_branch'?'neutral':canAdd?'available':'unavailable')}>{status==='choose_branch'?'Availability checked after branch selection':status==='loading'?'Checking branch stock…':canAdd?'Available at selected branch':'Out of stock at selected branch'}</div><button className="spider-add" type="button" disabled={!canAdd} onClick={()=>add(p,p.id==='11111111-1111-4111-8111-111111111111'?tiramisuSize:null)}>Add to bag <Plus size={16}/></button></div></article>})}</div>
 {!storefrontProducts.length&&<div className="spider-empty">Our dessert menu is being prepared. Please check back soon.</div>}<div className="spider-view-products"><button onClick={()=>setPage('menu')}>View all products <ArrowRight size={16}/></button><button onClick={()=>setPage('cart')}>Open bag <ShoppingBag size={16}/> · {cart.reduce((s,i)=>s+i.qty,0)}</button></div></section>
 <section className="spider-why-section"><div className="spider-kicker"><i/> WHY CHOOSE US</div><h2>Good desserts.<br/><em>Good intentions.</em></h2><div className="spider-why-grid"><article><b>01</b><h3>Dessert-first focus</h3><p>We care about the layers, texture and cocoa finish of every dessert.</p></article><article><b>02</b><h3>Simple ordering</h3><p>Choose your dessert first, pick a branch in your bag, then select an order type.</p></article><article><b>03</b><h3>Local support</h3><p>Need help with your order or location? Reach our team directly.</p></article><article><b>04</b><h3>Celebrations welcome</h3><p>Ask us about bulk dessert cups for parties, weddings and group events.</p></article></div></section>
 <section className="spider-bulk-section" id="bulk-order"><div className="spider-bulk-copy"><div className="spider-kicker"><i/> BIG PLANS. LITTLE CUPS.</div><h2>Make your celebration<br/><em>a little sweeter.</em></h2><p>Parties, weddings, birthdays or office celebrations — bring Spidy Sells to the whole crew.</p><div className="spider-bulk-stats"><div><b>₹55</b><small>per small tiramisu cup</small></div><div><b>50+</b><small>minimum quantity</small></div><div><b>100+</b><small>larger celebrations</small></div></div><button className="spider-bulk-button" onClick={()=>setBulkOrderOpen(true)}>Bulk order enquiry <span>?</span> <ArrowRight size={16}/></button></div><button type="button" className="spider-bulk-preview" onClick={()=>setBulkOrderOpen(true)}><span className="bulk-question">?</span><small>THE CROWD-PLEASER</small><strong>50 mini tiramisus</strong><b>₹2,750</b><span>50 cups × ₹55 each</span><i/><em>100+ cups? Let’s plan your celebration.</em><footer>Tap to customise <ArrowRight size={14}/></footer></button></section>
 <section className="spider-section" id="home-reviews"><div className="spider-section-title"><div><div className="spider-kicker"><i/> LOVE FROM THE WEB</div><h2>Sweet words.<br/><em>Real people.</em></h2><p>Customer feedback shared after enjoying a Spidy Sells order.</p></div><button className="spider-text-link" onClick={()=>setPage('reviews')}>View all reviews <ArrowRight size={16}/></button></div>{reviews.length?<div className="spider-review-grid">{reviews.slice(0,3).map(r=><article className="spider-review-card" key={r.id}><div className="spider-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div><p>{r.description}</p>{r.image_url&&<img src={r.image_url} alt="Customer review" loading="lazy"/>}<b>{r.customer_name}</b></article>)}</div>:<div className="spider-no-reviews"><b>Our review wall is waiting for its first story.</b><span>Customer reviews will appear here after they are submitted.</span></div>}</section>
 <section className="spider-about-section" id="about-us"><div className="spider-about-emblem"><span>✦</span><b>SPIDY<br/>SELLS</b><small>THE SWEET SIDE OF THE WEB</small></div><div><div className="spider-kicker"><i/> ABOUT SPIDY SELLS</div><h2>A small web of<br/><em>sweet happiness.</em></h2><p>Spidy Sells is a dessert-first local store bringing tiramisu and sweet moments to customers in Kolkata and Howrah. We believe a good dessert can turn an ordinary pause into a little celebration.</p><button className="spider-text-link" onClick={()=>setPage('about')}>Read our story <ArrowRight size={16}/></button></div></section>
 <section className="spider-home-contact"><div><div className="spider-kicker"><i/> NEED A HAND?</div><h2>We’re only a <em>message away.</em></h2><p>Order support, branch questions or a special celebration — talk to our team.</p></div><div className="spider-home-contact-actions"><a href="tel:+918910882074"><Phone size={16}/> +91 89108 82074</a><a href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/> WhatsApp support</a><button onClick={()=>setPage('contact')}>Contact page <ArrowRight size={15}/></button></div></section>
 <section className="spider-order-history-home"><div className="spider-kicker"><i/> ALREADY ORDERED?</div><h2>Track your <em>sweet order.</em></h2><p>Enter your order reference and the phone number used at checkout.</p><form className="customer-history-form" onSubmit={searchCustomerOrderHistory}><label>Order reference<input required value={historyReference} onChange={e=>setHistoryReference(e.target.value)} placeholder="e.g. SS-39E901A82D" autoComplete="off"/></label><label>Checkout phone number<input required type="tel" inputMode="tel" value={historyPhone} onChange={e=>setHistoryPhone(e.target.value)} placeholder="Your contact number" autoComplete="tel"/></label><button className="primary full" type="submit" disabled={!historyReference.trim()||!historyPhone.trim()}>View all orders <ArrowRight size={15}/></button></form></section>
 <div className="spider-home-bottom"><button onClick={()=>setPage('menu')}>Shop products</button><button onClick={()=>setPage('reviews')}>All customer reviews</button><button onClick={()=>setPage('about')}>About us</button><button onClick={()=>setPage('contact')}>Contact &amp; support</button></div>
 </main>}
 {page==='history'&&<main className="content narrow customer-orders-page"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to store</button><div className="kicker">SPIDY SELLS · ORDER HISTORY</div><h1>Your orders,<br/><em>all together.</em></h1><p className="lead">{historyReference?'Looking up orders linked to '+historyReference+'.':'Your order history is shown here after verification.'} Entered phone number ending in {historyPhone.replace(/[^0-9]/g,'').slice(-4)||'----'}.</p>{customerHistoryLoading&&<div className="customer-history-loading" role="status"><span className="history-loading-dot"/> Finding your orders…</div>}{customerHistoryMessage&&!customerHistoryLoading&&!(customerHistorySearched&&customerOrderHistory.length===0&&customerHistoryMessage.startsWith('No matching orders found'))&&<p className={`customer-history-message ${customerOrderHistory.length?'':'customer-history-error'}`} role="status">{customerHistoryMessage}</p>}{customerHistorySearched&&!customerHistoryLoading&&customerOrderHistory.length===0&&customerHistoryMessage.startsWith('No matching orders found')&&<div className="empty customer-history-empty"><ShoppingBag size={28}/><h2>No matching orders</h2><p>Check the order reference and phone number used at checkout, then try again.</p><button className="primary" onClick={()=>setPage('location')}>Try again <ArrowRight size={16}/></button></div>}{customerHistorySearched&&customerOrderHistory.length>0&&<><div className="customer-history-results-heading"><h2>All matching orders</h2><span>{customerOrderHistory.length} order{customerOrderHistory.length===1?'':'s'}</span></div><div className="customer-history-list">{customerOrderHistory.map(order=><article className="home-active-order customer-history-order" key={order.id||order.order_reference}><div className="active-order-heading"><h3>Order {order.order_reference}</h3><span className="order-status-pill">{pretty(order.status||'confirmed')}</span></div><div className="customer-history-meta"><span>{new Date(order.created_at).toLocaleString('en-IN')}</span><span>{order.order_type==='TAKEAWAY'?'Takeaway':'Delivery'} · {order.branch_name||'Spidy Sells'}</span></div><p>{(order.items||[]).map(i=>(i.product_name_snapshot||i.name)+' × '+i.quantity).join(' · ')||'Your dessert order'}</p><div className="active-order-bottom"><b>{rupees(order.total||0)}</b><button onClick={()=>{setOrderRef(order.order_reference);setOrderDetails({...order,customer_phone:historyPhone});setPage('success')}}>View details <ArrowRight size={14}/></button></div></article>)}</div></>}</main>}
 {page==='type'&&<main className="content"><button className="back" onClick={()=>setPage('cart')}><ArrowLeft size={16}/> Change location</button><div className="kicker">HELLO, {selectedCity}</div><h1>How would you<br/><em>like your treat?</em></h1><p className="lead">Choose what works best for you.</p><div className="type-grid"><button className="type-card" onClick={()=>{setKind('pickup');setPaymentMethod('cash_on_pickup');setPage('checkout')}}><div className="type-icon"><ShoppingBag/></div><span className="card-kicker">ORDER AHEAD</span><h2>Takeaway</h2><p>Pick up your dessert from an available branch. Place your order ahead and we'll get it ready for you.</p><span className="text-link">Choose takeaway <ArrowRight size={16}/></span></button><button className="type-card" onClick={()=>{const branch=branches.find(b=>b.id===selectedBranch);if(settings.delivery_enabled&&branch?.delivery_enabled){setKind('delivery');setPaymentMethod('online');setPage('checkout')}else setNotice('Delivery is not enabled at this location yet. Please choose another location or takeaway.')}}><div className="type-icon gold"><MapPin/></div><span className="card-kicker">AT YOUR DOOR</span><h2>Online order</h2><p>Have your dessert delivered to your address, where delivery is available.</p><span className="text-link">{settings.delivery_enabled?'Choose delivery':'COMING SOON'} <ArrowRight size={16}/></span></button></div></main>}
 {page==='menu'&&<main className="store-inner-page spider-products-page"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to home</button><div className="spider-kicker"><i/> THE SPIDY DESSERT MENU</div><h1>Choose your <em>favourite.</em></h1><p className="lead">Add desserts to your bag first. Choose Kolkata or Howrah when you open your bag.</p><div className="spider-product-grid">{storefrontProducts.map(p=>{const status=!selectedBranch?'choose_branch':stockLoaded?(stockByBranch[stockMapKey(p.id,selectedBranch)]||'out_of_stock'):'loading';const canAdd=!selectedBranch||status==='in_stock';return <article className="spider-product-card" key={p.id}><div className="spider-product-photo">{p.image_url?<img src={p.image_url} alt={p.name+' dessert'} loading="lazy"/>:<img src={heroSlides[0].image} alt={p.name+' dessert'} loading="lazy"/>}<span>THE SPIDY PICK</span></div><div className="spider-product-info"><div className="spider-product-heading"><h3>{p.name}</h3><b>{p.id==='11111111-1111-4111-8111-111111111111'?'₹99–₹130':rupees(p.price)}</b></div><p>{p.description}</p>{p.id==='11111111-1111-4111-8111-111111111111'&&<label className="spider-size-picker">Choose size<select value={tiramisuSize} onChange={e=>setTiramisuSize(e.target.value)}><option value="300">300 ml · ₹130</option><option value="200">200 ml · ₹99</option></select></label>}<div className={'spider-stock '+(status==='choose_branch'?'neutral':canAdd?'available':'unavailable')}>{status==='choose_branch'?'Select a branch in your bag to check stock':status==='loading'?'Checking branch stock…':canAdd?'Available at selected branch':'Out of stock at selected branch'}</div><button className="spider-add" type="button" disabled={!canAdd} onClick={()=>add(p,p.id==='11111111-1111-4111-8111-111111111111'?tiramisuSize:null)}>Add to bag <Plus size={16}/></button>{selectedBranch&&!canAdd&&<button className="check-other-location-button" onClick={()=>checkOtherLocation(p)} disabled={!stockLoaded}>Check other location to order <ArrowRight size={15}/></button>}</div></article>})}</div>{!storefrontProducts.length&&<div className="spider-empty">Our dessert menu is being prepared. Please check back soon.</div>}<div className="spider-page-bottom"><button className="primary" onClick={()=>setPage('cart')}><ShoppingBag size={17}/> Open my bag · {cart.reduce((s,i)=>s+i.qty,0)}</button></div></main>}
 {page==='reviews'&&<main className="store-inner-page spider-content-page"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to home</button><div className="spider-kicker"><i/> CUSTOMER LOVE</div><h1>Every review has<br/><em>a little story.</em></h1><p className="lead">Real feedback shared by customers after their Spidy Sells order.</p>{reviews.length?<div className="spider-review-grid all-reviews-grid">{reviews.map(r=><article className="spider-review-card" key={r.id}><div className="spider-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div><p>{r.description}</p>{r.image_url&&<img src={r.image_url} alt="Customer-submitted review" loading="lazy"/>}<b>{r.customer_name}</b><small>{new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</small></article>)}</div>:<div className="spider-no-reviews"><b>No customer reviews yet.</b><span>Once customers submit a review after an order, it will appear here.</span></div>}</main>}
 {page==='about'&&<main className="store-inner-page spider-content-page"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to home</button><div className="spider-kicker"><i/> OUR STORY</div><h1>Spun with care.<br/><em>Made for sweet moments.</em></h1><p className="lead">A local dessert stop for tiramisu lovers in Kolkata and Howrah.</p><div className="spider-about-story"><div className="spider-about-emblem large"><span>✦</span><b>SPIDY<br/>SELLS</b><small>THE SWEET SIDE OF THE WEB</small></div><div><h2>A little web of happiness.</h2><p>Spidy Sells is built around one simple idea: a dessert should feel like a treat. We bring together coffee-kissed layers, creamy textures and a cocoa finish to make small everyday moments feel special.</p><p>Our store serves customers through our Kolkata and Howrah locations. Browse desserts, add favourites to your bag, then select the branch that works for you.</p></div></div><section className="spider-why-section standalone"><div className="spider-kicker"><i/> WHY CHOOSE SPIDY SELLS</div><h2>The little things <em>matter.</em></h2><div className="spider-why-grid"><article><b>01</b><h3>Dessert-first focus</h3><p>We care about the layers, texture and finish of every dessert.</p></article><article><b>02</b><h3>Easy ordering</h3><p>Choose products first, select a branch in your bag, then continue to checkout.</p></article><article><b>03</b><h3>Local branch support</h3><p>Order through Kolkata and Howrah and contact us for other areas.</p></article><article><b>04</b><h3>Celebrations welcome</h3><p>Ask about small-cup bulk orders for parties, weddings and group events.</p></article></div></section><button className="spider-primary" onClick={()=>setPage('menu')}>Explore desserts <ArrowRight size={17}/></button></main>}
 {page==='contact'&&<main className="store-inner-page spider-content-page"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to home</button><div className="spider-kicker"><i/> CONTACT &amp; SUPPORT</div><h1>Need a hand?<br/><em>We’ve got you.</em></h1><p className="lead">For order questions, branch information or bulk enquiries, contact the Spidy Sells team.</p><div className="spider-support-cards"><a href="tel:+918910882074"><Phone size={21}/><b>Call Spidy Sells</b><strong>+91 89108 82074</strong><span>Speak to our team</span></a><a href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer"><MessageCircle size={21}/><b>WhatsApp support</b><strong>Chat with us</strong><span>Send your question directly</span></a><button onClick={()=>setBulkOrderOpen(true)}><ShoppingBag size={21}/><b>Bulk orders</b><strong>50+ mini tiramisus</strong><span>Parties, weddings and events</span></button></div><div className="spider-contact-branches"><article><small>KOLKATA</small><h2>{kolkataBranchInfo?.name||'Kolkata branch'}</h2><p>{kolkataBranchInfo?.address||'Spidy Sales, Don Bosco Circle, MBWA, Beniapukur, Kolkata, West Bengal 700017'}</p><span>{kolkataBranchInfo?.opening_hours||defaultOpeningHours}</span><button onClick={()=>selectCartBranch(kolkataBranchInfo)} disabled={!kolkataBranchInfo}>Choose this branch <ArrowRight size={15}/></button></article><article><small>HOWRAH</small><h2>{howrahBranchInfo?.name||'Howrah branch'}</h2><p>{howrahBranchInfo?.address||'Bankra Kabar Para, Life Line Pharmacy, Howrah, West Bengal'}</p><span>{howrahBranchInfo?.opening_hours||'8:30 AM–12 PM · 8:30 PM–11 PM · Closed Tuesdays & Fridays'}</span><button onClick={()=>selectCartBranch(howrahBranchInfo)} disabled={!howrahBranchInfo}>Choose this branch <ArrowRight size={15}/></button></article></div><div className="spider-other-location"><b>Somewhere else?</b><p>Not in Kolkata or Howrah? Message us with your location and we’ll let you know what we can arrange.</p><a href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20am%20outside%20Kolkata%20and%20Howrah.%20Can%20you%20help%3F" target="_blank" rel="noopener noreferrer">Contact us on WhatsApp <ArrowRight size={15}/></a></div></main>}
 {page==='cart'&&<main className="content narrow spider-cart-page"><button className="back" onClick={()=>setPage('menu')}><ArrowLeft size={16}/> Back to products</button><div className="spider-kicker"><i/> YOUR WEB OF GOODNESS</div><h1>Your <em>bag.</em></h1>{!cart.length?<div className="empty"><ShoppingBag size={30}/><h2>Nothing in your bag just yet.</h2><button className="primary" onClick={()=>setPage('menu')}>Explore desserts <ArrowRight size={17}/></button></div>:<><div className="cart-list">{cart.map(i=><div className="cart-row" key={i.cartKey||i.id}>{i.image_url?<img src={i.image_url} alt="" loading="lazy"/>:<div className="cart-image-empty" aria-hidden="true"><ChefHat size={20}/></div>}<div className="cart-name"><b>{i.name}</b><small>{rupees(i.price)} each</small><div className="qty"><button onClick={()=>changeQty(i.cartKey,-1)} aria-label="Decrease"><Minus size={14}/></button><span>{i.qty}</span><button onClick={()=>changeQty(i.cartKey,1)} aria-label="Increase"><Plus size={14}/></button></div></div><b>{rupees(i.price*i.qty)}</b></div>)}</div><div className="total"><span>Subtotal</span><b>{rupees(total)}</b></div>{!selectedBranch?<section className="cart-branch-select"><div className="spider-kicker"><i/> FIRST, PICK YOUR BRANCH</div><h2>Where should we spin your order?</h2><p>Choose Kolkata or Howrah. We’ll check availability for the branch you select.</p><div className="cart-branch-grid"><button onClick={()=>selectCartBranch(kolkataBranchInfo)} disabled={!kolkataBranchInfo}><span>01</span><b>Kolkata</b><small>{kolkataBranchInfo?.address||'Beniapukur, Kolkata'}</small><ArrowRight size={17}/></button><button onClick={()=>selectCartBranch(howrahBranchInfo)} disabled={!howrahBranchInfo}><span>02</span><b>Howrah</b><small>{howrahBranchInfo?.address||'Bankra, Howrah'}</small><ArrowRight size={17}/></button></div><div className="cart-other-place"><b>Somewhere else?</b><span>Tell us where you are ordering from and our team will help.</span><a href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20am%20ordering%20from%20outside%20Kolkata%20and%20Howrah.%20Can%20you%20help%3F" target="_blank" rel="noopener noreferrer">Contact us on WhatsApp <MessageCircle size={15}/></a></div></section>:<section className="cart-selected-branch"><small>YOUR SELECTED BRANCH</small><b>{selectedBranchInfo?.name||'Selected branch'}</b><span>{selectedBranchInfo?.address||''}</span><button type="button" className="outline-button" onClick={()=>setSelectedBranch('')}>Change branch</button>{!stockLoaded?<p>Checking product stock for this branch…</p>:cart.some(i=>stockByBranch[stockMapKey(i.id,selectedBranch)]!=='in_stock')?<p className="cart-stock-warning">One or more items are not in stock at this branch. Change branch or adjust your bag before continuing.</p>:<button className="primary full" onClick={()=>setPage('type')}>Continue to order options <ArrowRight size={17}/></button>}</section>}</>}</main>}
 {page==='checkout'&&<main className="content narrow"><button className="back" onClick={()=>setPage('cart')}><ArrowLeft size={16}/> Back to bag</button><div className="kicker">ALMOST YOURS</div><h1>Make it <em>happen.</em></h1><p className="lead">{kind==='pickup'?'Takeaway order':'Delivery order'} · {branches.find(b=>b.id===selectedBranch)?.name||'Selected location'}</p><form className="form" onSubmit={checkout}><label>Your name *<input required value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="What should we call you?"/></label><label>Phone number *<input required inputMode="tel" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="Your contact number"/></label>{kind==='delivery'?<><label>Full delivery address *<textarea required value={customer.address} onChange={e=>{setCustomer({...customer,address:e.target.value});setDeliveryLookupRequested(false);setDeliveryQuote(null);setQuoteError('')}} onBlur={()=>setDeliveryLookupRequested(true)} placeholder="House, street, area, landmark, PIN code"/></label></>:null}{kind==='delivery'&&<div className="delivery-quote" aria-live="polite">{quoteBusy?<small>Calculating driving distance…</small>:matchingDeliveryQuote?<><div><span>Driving distance</span><b>{Number(matchingDeliveryQuote.distanceKm).toFixed(1)} km</b></div><div><span>Delivery charge</span><b>{rupees(deliveryFee)}</b></div>{matchingDeliveryQuote.distanceApproximate&&<small className="quote-error">Approximate distance: Geoapify matched the PIN-code area rather than the exact address point. Add a street or nearby landmark for a more accurate quote.</small>}<small>Delivery fee: ₹15 per km, rounded up to the nearest rupee.</small><small className="routing-attribution">Routing by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · Map data © OpenStreetMap contributors</small></>:quoteError?<small className="quote-error">{quoteError}</small>:<small>Enter your full address, including area and PIN code. We’ll calculate the driving distance and delivery charge automatically.</small>}</div>}<div className="selected-branch-summary"><b>{kind==='pickup'?'Takeaway location':'Delivery from'}</b><span>{branches.find(b=>b.id===selectedBranch)?.name||'Selected location'}</span><small>{branches.find(b=>b.id===selectedBranch)?.address||'Please select your store location first.'}</small></div>{kind==='pickup'&&branches.find(b=>b.id===selectedBranch)?.address&&<section className="branch-map-card" aria-label="Takeaway pickup map"><div className="branch-map-heading"><div><b>Find your pickup location</b><small>{branches.find(b=>b.id===selectedBranch)?.address}</small></div><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branches.find(b=>b.id===selectedBranch)?.address||'')}`} target="_blank" rel="noreferrer">Get directions <ArrowRight size={14}/></a></div><iframe title={`Map to ${branches.find(b=>b.id===selectedBranch)?.name||'takeaway branch'}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(branches.find(b=>b.id===selectedBranch)?.address||'')}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/></section>}<label>Order notes (optional)<textarea value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})} placeholder="Anything we should know?"/></label>{kind==='pickup'?<div className="payment-methods"><p className="payment-title">Payment method</p><label className="payment-option"><input type="radio" name="paymentMethod" checked={paymentMethod==='cash_on_pickup'} onChange={()=>setPaymentMethod('cash_on_pickup')}/><span><b>Pay at takeaway</b><small>Pay when you collect your order.</small></span></label><label className="payment-option"><input type="radio" name="paymentMethod" checked={paymentMethod==='online'} onChange={()=>setPaymentMethod('online')}/><span><b>Pay online securely</b><small>Complete your payment through Razorpay before your order is confirmed.</small></span></label></div>:<div className="payment-methods"><p className="payment-title">Payment method</p><label className="payment-option"><input type="radio" name="paymentMethod" checked={paymentMethod==='online'} onChange={()=>setPaymentMethod('online')}/><span><b>Pay online securely</b><small>Online delivery orders must be paid online through Razorpay before confirmation.</small></span></label></div>}<div className="summary"><h3>Order summary</h3>{cart.map(i=><div className="sumline" key={i.id}><span>{i.name} × {i.qty}</span><span>{rupees(i.price*i.qty)}</span></div>)}<div className="sumline"><span>Subtotal</span><span>{rupees(total)}</span></div>{deliveryFee>0&&<div className="sumline"><span>Delivery</span><span>{rupees(deliveryFee)}</span></div>}<div className="sumline sum-total"><b>Total</b><b>{rupees(total+deliveryFee)}</b></div><small>{settings.pickup_instructions||'Your order will be prepared after confirmation.'}</small></div><button className="primary full" disabled={busy||paymentPendingReview||!cart.length||(kind==='delivery'&&(!matchingDeliveryQuote||quoteBusy))}>{paymentPendingReview?'Payment verification pending':busy?'Processing…':'Place order'} <ArrowRight size={17}/></button></form></main>}
 {page==='success'&&<main className="content narrow success"><div className="success-icon"><Check/></div><div className="kicker">THANK YOU</div><h1>{orderDetails?.status==='completed'?<>Order <br/><em>completed.</em></>:orderDetails?.status==='cancelled'?<>Order <br/><em>cancelled.</em></>:<>Your order is<br/><em>confirmed.</em></>}</h1><p className="lead">Order reference <b>{orderDetails?.order_reference||orderRef}</b>. {orderDetails?.status==='completed'?'This order has been completed.':orderDetails?.status==='cancelled'?'This order was cancelled.':'Thanks for choosing Spidy Sells! We’ve received your order and will contact you if we need any details.'}</p><div className="summary order-confirmation"><h3>Order details</h3><div className="sumline"><span>Status</span><b>{pretty(orderDetails?.status||'confirmed')}</b></div><div className="sumline"><span>Order type</span><b>{orderDetails?.order_type==='TAKEAWAY'?'Takeaway':'Online delivery'}</b></div><div className="sumline"><span>Location</span><b>{orderDetails?.branch_name||'Selected location'}</b></div>{(orderDetails?.items||[]).map((i,idx)=><div className="sumline" key={i.id||idx}><span>{i.product_name_snapshot||i.name} × {i.quantity||i.qty}</span><span>{rupees(i.line_total??Number(i.unit_price||i.price||0)*Number(i.quantity||i.qty||1))}</span></div>)}{orderDetails?.delivery_address&&<div className="sumline"><span>Delivery address</span><span>{orderDetails.delivery_address}</span></div>}{Number(orderDetails?.delivery_distance_km||0)>0&&<div className="sumline"><span>Driving distance</span><span>{Number(orderDetails.delivery_distance_km).toFixed(1)} km</span></div>}<div className="sumline"><span>Subtotal</span><span>{rupees(orderDetails?.subtotal??orderDetails?.total??0)}</span></div>{Number(orderDetails?.delivery_charge||0)>0&&<div className="sumline"><span>Delivery charge</span><span>{rupees(orderDetails.delivery_charge)}</span></div>}<div className="sumline sum-total"><b>Total</b><b>{rupees(orderDetails?.total||0)}</b></div><div className="sumline"><span>Payment</span><b>{orderDetails?.payment_method==='cash_on_pickup'?'Pay at takeaway':orderDetails?.payment_method==='online'?'Paid online · Razorpay':'Payment method unavailable'}</b></div><small>Your order status will appear on the homepage until the order is completed.</small></div>{orderDetails?.order_type==='TAKEAWAY'&&(()=>{const branchAddress=orderDetails?.branch_address||branches.find(b=>b.id===orderDetails?.branch_id)?.address||branches.find(b=>b.name===orderDetails?.branch_name)?.address||'';return branchAddress?<section className="branch-map-card confirmation-branch-map" aria-label="Takeaway pickup map"><div className="branch-map-heading"><div><b>Pickup location map</b><small>{branchAddress}</small></div><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branchAddress)}`} target="_blank" rel="noreferrer">Get directions <ArrowRight size={14}/></a></div><iframe title={`Map to ${orderDetails?.branch_name||'takeaway branch'}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(branchAddress)}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/><a className="primary full confirmation-directions-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branchAddress)}`} target="_blank" rel="noreferrer">Get direction <ArrowRight size={17}/></a></section>:null})()}<section className="review-section confirmation-review-section" aria-labelledby="order-review-heading"><div className="review-section-heading"><div className="kicker">YOUR EXPERIENCE MATTERS</div><h2 id="order-review-heading">How was your <em>experience?</em></h2><p>Thanks for your order. Share your feedback here.</p></div><form className="review-form" onSubmit={submitReview}><label>Your name<input required maxLength={100} value={reviewName} onChange={e=>setReviewName(e.target.value)} placeholder="Your name"/></label><fieldset className="review-stars"><legend>Your rating</legend>{[1,2,3,4,5].map(n=><button key={n} type="button" className={n<=reviewRating?'star-selected':'star-unselected'} onClick={()=>setReviewRating(n)} aria-label={n+' stars'}>★</button>)}<span>{reviewRating}/5</span></fieldset><label>Your review<textarea required maxLength={4000} rows={4} value={reviewDescription} onChange={e=>setReviewDescription(e.target.value)} placeholder="Tell us how your takeaway or delivery order went…"/></label><div className="review-form-bottom"><label className="review-image-input">Add one image (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setReviewImage(e.target.files?.[0]||null)}/><small>{reviewImage?reviewImage.name:'JPG, PNG, WEBP · max 5 MB'}</small></label><small>{reviewDescription.length}/4000</small></div><button className="primary" disabled={reviewBusy}>{reviewBusy?'Submitting…':'Submit review'} <ArrowRight size={15}/></button></form></section><div className="receipt-actions"><button type="button" className="primary full" onClick={()=>printReceipt(orderDetails)}><Package size={16}/> Download receipt (PDF) / Print</button><button className="back" style={{marginTop:18}} onClick={()=>{setCustomer(emptyCustomer);setPage('location')}}>Back to home</button></div><section className="review-section confirmation-review-section" aria-labelledby="order-review-heading"><div className="review-section-heading"><div className="kicker">YOUR EXPERIENCE MATTERS</div><h2 id="order-review-heading">How was your <em>experience?</em></h2><p>Thank you for ordering from Spidy Sells. Share your feedback while it’s fresh.</p></div><form className="review-form" onSubmit={submitReview}><label>Your name<input required maxLength={100} value={reviewName} onChange={e=>setReviewName(e.target.value)} placeholder="Your name"/></label><fieldset className="review-stars"><legend>Your rating</legend>{[1,2,3,4,5].map(n=><button key={n} type="button" className={n<=reviewRating?'star-selected':'star-unselected'} onClick={()=>setReviewRating(n)} aria-label={n+' stars'} aria-pressed={reviewRating===n}>★</button>)}<span>{reviewRating} / 5</span></fieldset><label>Your review<textarea required maxLength={4000} rows={4} value={reviewDescription} onChange={e=>setReviewDescription(e.target.value)} placeholder="Tell us how your takeaway or delivery order went…"/></label><div className="review-form-bottom"><label className="review-image-input">Add one image (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setReviewImage(e.target.files?.[0]||null)}/><small>{reviewImage?reviewImage.name:'JPG, PNG or WEBP · max 5 MB'}</small></label><small>{reviewDescription.length} / 4000</small></div><button className="primary" type="submit" disabled={reviewBusy}>{reviewBusy?'Submitting review…':'Submit review'} <ArrowRight size={15}/></button></form></section></main>}
 {page==='owner'&&!session&&<main className="content narrow"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to store</button><div className="kicker">PRIVATE AREA</div><h1>Owner <em>login.</em></h1><form className="form" onSubmit={login}><label>Owner email<input name="email" type="email" autoComplete="username" required placeholder="Enter your admin email"/></label><label>Admin password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your admin password"/></label><button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in securely'} <ArrowRight size={17}/></button></form><p className="fine-print">Use the email and password you create for the owner in Supabase Authentication. Only accounts explicitly approved in the admin allowlist can access store management. No SMS provider is needed for email/password login.</p></main>}
 {page==='admin'&&session&&<main className="content admin-page"><div className="admin-heading"><div><div className="kicker">SPIDY SELLS · MANAGEMENT</div><h1>Your store,<br/><em>your way.</em></h1></div><button className="outline-button" onClick={logout}><LogOut size={15}/> Log out</button></div><div className="admin-tabs">{[{id:'orders',label:'Orders',icon:ShoppingBag},{id:'products',label:'Products',icon:Package},{id:'branches',label:'Branches',icon:Store},{id:'settings',label:'Settings',icon:Settings}].map(t=><button key={t.id} className={tab===t.id?'selected':''} onClick={()=>{setTab(t.id);setNotice('')}}><t.icon size={15}/>{t.label}</button>)}</div>
 {tab==='orders'&&<><div className="stats-grid"><div><small>Total order inquiries</small><b>{orders.length}</b></div><div><small>Completed sales</small><b>{rupees(completedSales)}</b></div><div><small>Converted orders</small><b>{converted}</b></div><div><small>Not converted / cancelled</small><b>{unconverted}</b></div></div><div className="section-heading"><h2>Order management</h2><button className="outline-button" onClick={loadAdminData} disabled={dashboardLoading}><RefreshCw size={14}/> {dashboardLoading?'Loading…':'Refresh'}</button></div><p className="fine-print order-history-count" role="status">{dashboardLoading?'Loading all saved orders…':`Showing all ${orders.length} saved orders, newest first.`}</p><div className="table-wrap"><table><thead><tr><th>Order / date</th><th>Customer</th><th>Type</th><th>Total</th><th>Payment</th><th>Conversion status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><b>{o.order_reference}</b><small>{new Date(o.created_at).toLocaleString('en-IN')}</small></td><td>{o.customer_name}<small>{o.customer_phone}</small></td><td>{pretty(o.order_type)}</td><td>{rupees(o.total)}</td><td><b>{o.payment_method==='online'?'Pay online':o.payment_method==='test_online'?'TEST payment (no charge)':o.payment_method==='cash_on_pickup'?'Pay at takeaway':'Unspecified payment method'}</b><small>{pretty(o.payment_status||'pending')}</small></td><td><select value={o.status} onChange={e=>updateStatus(o,e.target.value)}>{statusOptions.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select><button type="button" className="outline-button receipt-print-button" onClick={()=>printReceipt(o)}><Package size={13}/> Print bill</button><button type="button" className="outline-button review-admin-button" onClick={()=>setReviewModalOpen(true)}>See review</button></td></tr>)}</tbody></table>{!orders.length&&<p className="empty-table">{dashboardLoading?'Loading orders…':'No orders recorded yet.'}</p>}</div><p className="fine-print">Sales totals include orders marked Completed. Online delivery orders require successful online payment.</p></>}
 {tab==='products'&&<><div className="section-heading"><h2>Menu products</h2><button className="primary small-button" onClick={()=>setEditingProduct({name:'',description:'',price:0,image_url:'',published:true,available:true})}><Plus size={15}/> Add product</button></div>{editingProduct&&<form className="admin-form" onSubmit={saveProduct}><h3>{editingProduct.id?'Edit product':'New product'}</h3><label>Product name<input name="name" required defaultValue={editingProduct.name}/></label><label>Description<textarea name="description" defaultValue={editingProduct.description}/></label><label>Price in ₹<input name="price" type="number" min="0" step="1" required defaultValue={editingProduct.price}/></label><label>Image URL<input name="image_url" type="url" defaultValue={editingProduct.image_url||''} placeholder="https://…"/></label><label className="check-label"><input name="published" type="checkbox" defaultChecked={editingProduct.published}/> Published on storefront</label><label className="check-label"><input name="available" type="checkbox" defaultChecked={editingProduct.available}/> Available to order</label><div className="inline-actions"><button className="primary small-button">Save product</button><button type="button" className="outline-button" onClick={()=>setEditingProduct(null)}>Cancel</button></div></form>}<div className="admin-cards">{products.map(p=><article className="manage-card" key={p.id}>{p.image_url?<img src={p.image_url} alt="" loading="lazy"/>:<div className="manage-product-image-empty" aria-hidden="true"><Package size={24}/></div>}<div className="manage-card-body"><b>{p.name}</b><span>{rupees(p.price)}</span><small>{p.published?'Published':'Hidden'} · {p.available?'Available':'Unavailable'}</small><section className="branch-stock-management" aria-label={'Stock status for '+p.name}><div className="branch-stock-heading">Stock by location</div>{branches.length?branches.map(branch=>{const key=stockMapKey(p.id,branch.id);const status=stockLoaded?(stockByBranch[key]||'unknown'):'loading';const saving=Boolean(stockSaving[key]);return <div className="branch-stock-row" key={branch.id}><div className="branch-stock-label"><b>{branch.name}</b><small>{!branch.active?'Inactive location · hidden from customers':branch.address||'Active location'}</small>{status==='unknown'&&<small className="stock-unavailable-note">Stock setting unavailable. Refresh to retry.</small>}</div><div className="stock-actions" role="group" aria-label={'Stock status at '+branch.name}><button type="button" className={'stock-choice stock-choice-in '+(status==='in_stock'?'selected':'')} aria-pressed={status==='in_stock'} disabled={!stockLoaded||saving||status==='unknown'} onClick={()=>setBranchProductStock(p,branch,'in_stock')}>{saving?'Saving…':'In-stock'}</button><button type="button" className={'stock-choice stock-choice-out '+(status==='out_of_stock'?'selected':'')} aria-pressed={status==='out_of_stock'} disabled={!stockLoaded||saving||status==='unknown'} onClick={()=>setBranchProductStock(p,branch,'out_of_stock')}>{saving?'Saving…':'Out of stock'}</button></div></div>}):<small>Add a branch first, then manage its stock here.</small>}</section><div className="inline-actions"><button className="outline-button" onClick={()=>setEditingProduct(p)}><Pencil size={14}/> Edit</button><button className="danger-outline" onClick={()=>deleteProduct(p)}><Trash2 size={14}/> Remove</button></div></div></article>)}</div></>}
 {tab==='branches'&&<><div className="section-heading"><h2>Branch locations</h2><button className="primary small-button" onClick={()=>setEditingBranch({name:'',address:'',contact_phone:'',google_maps_url:'',opening_hours:defaultOpeningHours,active:true,takeaway_enabled:true,delivery_enabled:false})}><Plus size={15}/> Add branch</button></div>{editingBranch&&<form className="admin-form" onSubmit={saveBranch}><h3>{editingBranch.id?'Edit branch':'New branch'}</h3><label>Branch name<input name="name" required defaultValue={editingBranch.name}/></label><label>Full address<input name="address" required defaultValue={editingBranch.address}/></label><label>Contact phone<input name="contact_phone" defaultValue={editingBranch.contact_phone}/></label><label>Google Maps link<input name="google_maps_url" type="url" defaultValue={editingBranch.google_maps_url||''}/></label><label>Opening hours shown on homepage<textarea name="opening_hours" required defaultValue={editingBranch.opening_hours||defaultOpeningHours} placeholder="Open 4:00 PM – 7:30 PM · Closed Tuesdays & Fridays"/><small>Example: Open 4:00 PM – 7:30 PM · Closed Tuesdays & Fridays. Edit this for each location.</small></label><label className="check-label"><input name="active" type="checkbox" defaultChecked={editingBranch.active}/> Active / visible to customers</label><label className="check-label"><input name="takeaway_enabled" type="checkbox" defaultChecked={editingBranch.takeaway_enabled}/> Accept takeaway orders</label><label className="check-label"><input name="delivery_enabled" type="checkbox" defaultChecked={editingBranch.delivery_enabled}/> Delivery available from this branch</label><div className="inline-actions"><button className="primary small-button">Save branch</button><button type="button" className="outline-button" onClick={()=>setEditingBranch(null)}>Cancel</button></div></form>}<div className="admin-cards">{branches.map(b=><article className="manage-card branch-card" key={b.id}><div className="branch-symbol"><MapPin/></div><div className="manage-card-body"><b>{b.name}</b><span>{b.address}</span><small>{b.active?'Active':'Inactive'} · Takeaway {b.takeaway_enabled?'on':'off'} · Delivery {b.delivery_enabled?'on':'off'}</small><small>Opening hours: {b.opening_hours||'Not set'}</small>{b.google_maps_url&&<a href={b.google_maps_url} target="_blank" rel="noreferrer">Open map <ExternalLink size={13}/></a>}<div className="inline-actions"><button className="outline-button" onClick={()=>setEditingBranch(b)}><Pencil size={14}/> Edit</button><button className="danger-outline" onClick={()=>deleteBranch(b)}><Trash2 size={14}/> Remove</button></div></div></article>)}{!branches.length&&<p className="empty-table">No branches configured yet. Add a verified location to show it to customers.</p>}</div></>}
 {tab==='settings'&&<><div className="section-heading"><h2>Store settings</h2></div><form className="admin-form" onSubmit={saveSettings}><label>Store name<input name="business_name" required defaultValue={settings.business_name}/></label><label>WhatsApp number with country code<input name="whatsapp_number" required defaultValue={settings.whatsapp_number}/></label><p className="fine-print">Delivery fee is calculated automatically at ₹15 per kilometre, rounded up to the nearest rupee.</p><label>Customer checkout instructions<textarea name="pickup_instructions" defaultValue={settings.pickup_instructions||''}/></label><label className="check-label"><input name="delivery_enabled" type="checkbox" defaultChecked={settings.delivery_enabled}/> Enable online delivery checkout</label><button className="primary small-button">Save settings</button></form><form className="admin-form" onSubmit={changePassword}><h3><LockKeyhole size={17}/> Change password</h3><label>New password<input type="password" minLength="10" required value={passwords.next} onChange={e=>setPasswords({...passwords,next:e.target.value})}/></label><label>Confirm new password<input type="password" minLength="10" required value={passwords.confirm} onChange={e=>setPasswords({...passwords,confirm:e.target.value})}/></label><button className="primary small-button">Update password</button></form><form className="admin-form destructive" onSubmit={resetOrders}><h3>Reset all order records</h3><p>This permanently deletes all orders and order items. It records an audit event. This cannot be undone.</p><label>Type RESET ALL ORDERS to confirm<input value={resetText} onChange={e=>setResetText(e.target.value)} placeholder="RESET ALL ORDERS"/></label><button className="danger-button" disabled={resetText!=='RESET ALL ORDERS'}>Reset all orders</button></form></>}
 </main>}
 {reviewModalOpen&&<div className="review-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setReviewModalOpen(false)}}><section className="review-modal" role="dialog" aria-modal="true"><div className="review-modal-heading"><h2>Customer reviews ({reviews.length})</h2><button className="outline-button" onClick={()=>setReviewModalOpen(false)}><X size={16}/> Close</button></div>{reviews.length===0?<p>No reviews submitted yet.</p>:<div className="review-admin-list">{reviews.map(r=><article className="review-admin-item" key={r.id}><div className="review-admin-item-heading"><div><b>{r.customer_name}</b><div className="review-card-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div></div><small>{new Date(r.created_at).toLocaleString('en-IN')}</small></div><p>{r.description}</p>{r.image_url&&<img src={r.image_url} alt="Customer review"/>}<button className="danger-outline" onClick={()=>deleteReview(r)}><Trash2 size={14}/> Delete review</button></article>)}</div>}</section></div>}
 {bulkOrderOpen&&<div className="bulk-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setBulkOrderOpen(false)}}><section className="bulk-modal spider-bulk-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title"><div className="bulk-modal-heading"><div><div className="spider-kicker"><i/> SPIDY SELLS · BULK ORDERS</div><h2 id="bulk-modal-title">Big day. <em>Big sweetness.</em></h2><p>Small tiramisu cups at an indicative ₹55 each for parties, weddings and celebrations.</p></div><button type="button" className="outline-button" onClick={()=>setBulkOrderOpen(false)}><X size={17}/> Close</button></div><div className="bulk-choice-row"><div><b>50 mini tiramisus</b><span>50 × ₹55</span><strong>₹2,750</strong></div><div><b>100+ mini tiramisus</b><span>For bigger celebrations</span><strong>Custom quantity</strong></div></div><form className="bulk-order-form" onSubmit={submitBulkOrder}><label>What are you planning?<select value={bulkEvent} onChange={e=>setBulkEvent(e.target.value)}><option>Party</option><option>Wedding</option><option>Birthday</option><option>Corporate event</option><option>Family celebration</option><option>Other</option></select></label><label>How many small tiramisu cups?<input type="number" min="50" step="1" required value={bulkQuantity} onChange={e=>setBulkQuantity(e.target.value)}/><small>Minimum 50 cups · indicative price ₹55 each</small></label><div className="bulk-estimate"><span>Estimated starting total</span><b>₹{bulkEstimate.toLocaleString('en-IN')}</b></div><label>Your name<input required value={bulkName} onChange={e=>setBulkName(e.target.value)} placeholder="Your name"/></label><label>Phone number<input required type="tel" value={bulkPhone} onChange={e=>setBulkPhone(e.target.value)} placeholder="Your contact number"/></label><label>City / area<input required value={bulkCity} onChange={e=>setBulkCity(e.target.value)} placeholder="Kolkata, Howrah or nearby"/></label><label>Event date (optional)<input type="date" value={bulkDate} onChange={e=>setBulkDate(e.target.value)}/></label><button className="spider-bulk-button full" type="submit">Send bulk enquiry on WhatsApp <MessageCircle size={17}/></button></form><small className="bulk-modal-note">Final availability, delivery and pricing are confirmed by the Spidy Sells team.</small></section></div>}
 <a className="floating-help" href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Spidy Sells support"><MessageCircle size={19}/><span>Need help?</span></a>
 <footer className="footer"><div className="footer-brand"><img className="footer-logo" src={spidySellsLogo} alt="Spidy Sells logo" /></div><p>Small moments. Beautiful desserts.</p><nav className="footer-nav" aria-label="Footer links"><a href="/" onClick={e=>{e.preventDefault();setPage('location')}}>Home</a><a href="/products" onClick={e=>{e.preventDefault();setPage('menu')}}>Products</a><a href="/about" onClick={e=>{e.preventDefault();setPage('about')}}>About us</a><a href="/reviews" onClick={e=>{e.preventDefault();setPage('reviews')}}>Reviews</a><a href="/contact" onClick={e=>{e.preventDefault();setPage('contact')}}>Contact</a></nav><div className="footer-socials" aria-label="Spidy Sells social media">
 <a className="footer-social-icon instagram-link" href="https://www.instagram.com/spidy_sells?xtok=b3Y1cmpvZG1iemZi&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram">
  <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="spidy-instagram-footer" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#feda75"/><stop offset=".34" stopColor="#fa7e1e"/><stop offset=".62" stopColor="#d62976"/><stop offset=".82" stopColor="#962fbf"/><stop offset="1" stopColor="#4f5bd5"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="url(#spidy-instagram-footer)"/><rect x="6.5" y="6.5" width="11" height="11" rx="3.3" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.3" cy="6.9" r="1.1" fill="#fff"/></svg>
 </a>
 <a className="footer-social-icon facebook-link" href="https://www.facebook.com/share/1C9pUYo87k/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M13.4 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6v2H6.8v3.2h2.9V21h3.7Z"/></svg>
 </a>
 <a className="footer-social-icon whatsapp-link" href="https://wa.me/918910882074?text=Hi%20Spidy%20Sells%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer" aria-label="WhatsApp support" title="WhatsApp support">
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#25D366"/><path fill="#fff" d="M17.25 14.65c-.28-.14-1.65-.82-1.91-.91-.26-.1-.44-.14-.63.14-.19.28-.72.91-.88 1.09-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.24-1.37-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.12-.12.28-.33.42-.49.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.63-1.51-.86-2.07-.23-.54-.46-.47-.63-.48h-.54c-.19 0-.49.07-.75.35-.26.28-.98.96-.98 2.33s1 2.7 1.14 2.89c.14.19 1.97 3.01 4.77 4.22.67.29 1.19.47 1.6.6.67.21 1.28.18 1.76.11.54-.08 1.65-.68 1.88-1.34.23-.66.23-1.23.16-1.34-.07-.12-.26-.19-.54-.33Z"/></svg>
 </a>
 <a className="footer-phone-link" href="tel:+918910882074">Call +91 89108 82074</a>
</div><div className="copyright">© {new Date().getFullYear()} Spidy Sells · Kolkata &amp; Howrah, India</div></footer>
 </div>{introPlaying&&<SpiderWelcomeIntro onSkip={finishIntro}/>}</div>
}