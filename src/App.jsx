import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { spidySellsLogo } from './spidy-logo.js';
import { ArrowLeft, ArrowRight, ChefHat, MapPin, Minus, Plus, ShoppingBag, Clock3, Check, X, Package, Store, ChartNoAxesCombined, Settings, LogOut, RefreshCw, Pencil, Trash2, LockKeyhole, ExternalLink, Music2, Volume2, VolumeX } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const whatsappDefault = '';
const rupees = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
const emptyCustomer = {name:'',phone:'',address:'',notes:''};
const defaultSettings = {business_name:'Spidy Sells',whatsapp_number:'',currency:'INR',delivery_enabled:false,delivery_charge:0,pickup_instructions:''};
const statusOptions = ['pending','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled','not_converted','whatsapp_initiated'];
const pretty = s => String(s||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const routeToPage = {'/':'location','/order-type':'type','/menu':'menu','/bag':'cart','/checkout':'checkout','/order-confirmation':'success','/admin':'owner'};
const pageToRoute = {location:'/',type:'/order-type',menu:'/menu',cart:'/bag',checkout:'/checkout',success:'/order-confirmation',owner:'/admin',admin:'/admin'};


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
    {spokes.map(({x,y,index})=><path key={index} className="spider-web-spoke" pathLength="1" style={{animationDelay:(3.48+index*0.022)+'s'}} d={`M 500 500 L ${x.toFixed(2)} ${y.toFixed(2)}`}/>)}
   </g>
   <g className="spider-web-rings">
    {rings.map((radius,index)=><circle key={radius} className="spider-web-ring" pathLength="1" style={{animationDelay:(3.52+index*0.105)+'s'}} cx="500" cy="500" r={radius}/>)}
    {Array.from({length:8},(_,index)=>{
     const angle=(-Math.PI/2)+(index*Math.PI/4);
     const x=500+Math.cos(angle)*378;
     const y=500+Math.sin(angle)*378;
     const x2=500+Math.cos(angle+Math.PI/4)*378;
     const y2=500+Math.sin(angle+Math.PI/4)*378;
     const qx=500+Math.cos(angle+Math.PI/8)*300;
     const qy=500+Math.sin(angle+Math.PI/8)*300;
     return <path key={'bridge-'+index} className="spider-web-bridge" pathLength="1" style={{animationDelay:(3.7+index*0.07)+'s'}} d={`M ${x.toFixed(2)} ${y.toFixed(2)} Q ${qx.toFixed(2)} ${qy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`}/>;
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


function createSpookySoundscape(){
 const AudioContextConstructor=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextConstructor)return null;
 const context=new AudioContextConstructor();
 const master=context.createGain();
 master.gain.value=0;
 const compressor=context.createDynamicsCompressor();
 compressor.threshold.value=-24;
 compressor.knee.value=18;
 compressor.ratio.value=5;
 compressor.attack.value=0.025;
 compressor.release.value=0.35;
 master.connect(compressor);
 compressor.connect(context.destination);

 const dryBus=context.createGain();
 dryBus.gain.value=0.82;
 dryBus.connect(master);
 const wetBus=context.createGain();
 wetBus.gain.value=0.34;
 wetBus.connect(master);
 const reverb=context.createConvolver();
 const impulseLength=Math.floor(context.sampleRate*2.7);
 const impulse=context.createBuffer(2,impulseLength,context.sampleRate);
 for(let channel=0;channel<2;channel++){
  const samples=impulse.getChannelData(channel);
  for(let i=0;i<impulseLength;i++){
   const fade=Math.pow(1-i/impulseLength,3.1);
   samples[i]=(Math.random()*2-1)*fade;
  }
 }
 reverb.buffer=impulse;
 reverb.connect(wetBus);

 const lowpass=context.createBiquadFilter();
 lowpass.type='lowpass';
 lowpass.frequency.value=820;
 lowpass.Q.value=0.45;
 lowpass.connect(dryBus);
 lowpass.connect(reverb);
 const droneNotes=[
  {frequency:55,gain:0.26,type:'sine'},
  {frequency:82.4069,gain:0.12,type:'triangle'},
  {frequency:155.5635,gain:0.055,type:'sine'},
  {frequency:164.8138,gain:0.028,type:'sine'}
 ];
 const droneOscillators=droneNotes.map(note=>{
  const oscillator=context.createOscillator();
  const volume=context.createGain();
  oscillator.type=note.type;
  oscillator.frequency.value=note.frequency;
  volume.gain.value=note.gain;
  oscillator.connect(volume);
  volume.connect(lowpass);
  oscillator.start();
  return oscillator;
 });

 const shimmerFilter=context.createBiquadFilter();
 shimmerFilter.type='bandpass';
 shimmerFilter.frequency.value=1450;
 shimmerFilter.Q.value=0.65;
 shimmerFilter.connect(dryBus);
 shimmerFilter.connect(reverb);
 const noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
 const noiseSamples=noiseBuffer.getChannelData(0);
 for(let i=0;i<noiseSamples.length;i++)noiseSamples[i]=(Math.random()*2-1)*0.32;
 const noise=context.createBufferSource();
 noise.buffer=noiseBuffer;
 noise.loop=true;
 const noiseGain=context.createGain();
 noiseGain.gain.value=0.027;
 noise.connect(noiseGain);
 noiseGain.connect(shimmerFilter);
 noise.start();

 const bellNotes=[392,466.1638,622.254,523.251,349.228,415.305,587.33,311.127,466.1638,369.994];
 let noteIndex=0;
 const playBell=()=>{
  if(context.state==='closed')return;
  const frequency=bellNotes[noteIndex%bellNotes.length];
  noteIndex+=1;
  const now=context.currentTime;
  const bellFilter=context.createBiquadFilter();
  bellFilter.type='lowpass';
  bellFilter.frequency.setValueAtTime(2300,now);
  bellFilter.frequency.exponentialRampToValueAtTime(950,now+2.4);
  const partials=[{ratio:1,level:0.035},{ratio:2.756,level:0.006}];
  partials.forEach(partial=>{
   const oscillator=context.createOscillator();
   const envelope=context.createGain();
   oscillator.type='sine';
   oscillator.frequency.value=frequency*partial.ratio;
   envelope.gain.setValueAtTime(0.0001,now);
   envelope.gain.exponentialRampToValueAtTime(partial.level,now+0.045);
   envelope.gain.exponentialRampToValueAtTime(0.0001,now+2.6);
   oscillator.connect(envelope);
   envelope.connect(bellFilter);
   oscillator.start(now);
   oscillator.stop(now+2.7);
  });
  bellFilter.connect(dryBus);
  bellFilter.connect(reverb);
 };
 let chordIndex=0;
 const progression=[
  [55,82.4069,155.5635,164.8138],
  [51.9131,77.7817,138.5913,155.5635],
  [43.6535,65.4064,130.8128,146.8324],
  [49,73.4162,146.8324,164.8138]
 ];
 const motifTimer=window.setInterval(playBell,4300);
 const chordTimer=window.setInterval(()=>{
  chordIndex=(chordIndex+1)%progression.length;
  const now=context.currentTime;
  progression[chordIndex].forEach((frequency,index)=>{
   droneOscillators[index].frequency.setTargetAtTime(frequency,now,2.8);
  });
 },10500);

 return {
  resume:()=>context.resume(),
  setVolume(value){
   if(context.state==='closed')return;
   const now=context.currentTime;
   master.gain.cancelScheduledValues(now);
   master.gain.setTargetAtTime(Math.max(0,Math.min(0.36,Number(value)||0)),now,0.45);
  },
  dispose(){
   window.clearInterval(motifTimer);
   window.clearInterval(chordTimer);
   try{noise.stop()}catch{}
   droneOscillators.forEach(oscillator=>{try{oscillator.stop()}catch{}});
   context.close();
  }
 };
}

export default function App(){
 const [page,setPage]=useState(()=>{const path=window.location.pathname.replace(/\/+$/,'')||'/';return routeToPage[path]||(path==='/admin'?'owner':'not-found')}),[introPlaying,setIntroPlaying]=useState(()=>{try{return window.location.pathname==='/'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&window.sessionStorage.getItem('spidy-intro-seen')!=='1'}catch{return false}}),[kind,setKind]=useState('pickup'),[cart,setCart]=useState([]),[customer,setCustomer]=useState(emptyCustomer),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[orderRef,setOrderRef]=useState(''),[paymentMethod,setPaymentMethod]=useState('cash_on_pickup'),[orderDetails,setOrderDetails]=useState(null),[activeOrder,setActiveOrder]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('spidy_active_order')||'null')}catch{return null}});
 const [products,setProducts]=useState([]),[branches,setBranches]=useState([]),[settings,setSettings]=useState(defaultSettings),[selectedBranch,setSelectedBranch]=useState(''),[session,setSession]=useState(null),[tab,setTab]=useState('orders'),[orders,setOrders]=useState([]),[editingProduct,setEditingProduct]=useState(null),[editingBranch,setEditingBranch]=useState(null),[resetText,setResetText]=useState(''),[passwords,setPasswords]=useState({next:'',confirm:''}),[dashboardLoading,setDashboardLoading]=useState(false),[deliveryQuote,setDeliveryQuote]=useState(null),[quoteBusy,setQuoteBusy]=useState(false),[quoteError,setQuoteError]=useState(''),[deliveryLookupRequested,setDeliveryLookupRequested]=useState(false);
 const [customerOrderHistory,setCustomerOrderHistory]=useState([]),[customerHistoryLoading,setCustomerHistoryLoading]=useState(false),[customerHistorySearched,setCustomerHistorySearched]=useState(false),[customerHistoryMessage,setCustomerHistoryMessage]=useState('');
 const [historyReference,setHistoryReference]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('spidy_active_order')||'null')?.order_reference||''}catch{return ''}});
 const [historyPhone,setHistoryPhone]=useState(()=>{try{return JSON.parse(window.localStorage.getItem('spidy_active_order')||'null')?.customer_phone||''}catch{return ''}});
 const total=useMemo(()=>cart.reduce((s,i)=>s+Number(i.price)*i.qty,0),[cart]);
 const matchingDeliveryQuote=kind==='delivery'&&deliveryQuote?.branchId===selectedBranch&&deliveryQuote?.address===customer.address.trim()?deliveryQuote:null;
 const deliveryFee=kind==='delivery'?Number(matchingDeliveryQuote?.deliveryCharge||0):0;
 const selectedBranchInfo=branches.find(branch=>branch.id===selectedBranch);
 const selectedCity=/howrah/i.test((selectedBranchInfo?.name||'')+' '+(selectedBranchInfo?.address||''))?'HOWRAH':'KOLKATA';
 const [musicEnabled,setMusicEnabled]=useState(()=>{try{return window.localStorage.getItem('spidy-sells-music')!=='off'}catch{return true}});
 const [musicStarted,setMusicStarted]=useState(false);
 const [musicVolume,setMusicVolume]=useState(0.14);
 const musicControllerRef=useRef(null);
 const musicEnabledRef=useRef(musicEnabled);
 const musicVolumeRef=useRef(musicVolume);

 useEffect(()=>{
  if(!introPlaying)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){finishIntro();return}
  const timer=window.setTimeout(finishIntro,6350);
  return()=>window.clearTimeout(timer);
 },[introPlaying]);
 useEffect(()=>{
  if(!introPlaying)return;
  const onKeyDown=event=>{if(event.key==='Escape')finishIntro()};
  window.addEventListener('keydown',onKeyDown);
  return()=>window.removeEventListener('keydown',onKeyDown);
 },[introPlaying]);

 function startSpookyMusic(forceStart=false){
  if(!forceStart&&!musicEnabledRef.current)return;
  if(!musicControllerRef.current){
   musicControllerRef.current=createSpookySoundscape();
  }
  const controller=musicControllerRef.current;
  if(!controller){setNotice('Background audio is not supported in this browser.');return}
  controller.setVolume(musicEnabledRef.current||forceStart?musicVolumeRef.current:0);
  controller.resume().then(()=>setMusicStarted(true)).catch(()=>setMusicStarted(false));
 }
 function toggleSpookyMusic(){
  if(musicStarted){
   musicEnabledRef.current=false;
   setMusicEnabled(false);
   setMusicStarted(false);
   try{window.localStorage.setItem('spidy-sells-music','off')}catch{}
   musicControllerRef.current?.setVolume(0);
   return;
  }
  musicEnabledRef.current=true;
  setMusicEnabled(true);
  try{window.localStorage.setItem('spidy-sells-music','on')}catch{}
  startSpookyMusic(true);
 }


 useEffect(()=>{
  musicEnabledRef.current=musicEnabled;
  musicVolumeRef.current=musicVolume;
  if(musicControllerRef.current){
   musicControllerRef.current.setVolume(musicEnabled&&musicStarted?musicVolume:0);
  }
 },[musicEnabled,musicStarted,musicVolume]);
 useEffect(()=>{
  if(!musicEnabled)return;
  const startOnFirstInteraction=event=>{
   if(event.target?.closest?.('.ambient-music-control'))return;
   if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
   startSpookyMusic();
   document.removeEventListener('pointerdown',startOnFirstInteraction,true);
   document.removeEventListener('keydown',startOnFirstInteraction,true);
  };
  document.addEventListener('pointerdown',startOnFirstInteraction,true);
  document.addEventListener('keydown',startOnFirstInteraction,true);
  return()=>{
   document.removeEventListener('pointerdown',startOnFirstInteraction,true);
   document.removeEventListener('keydown',startOnFirstInteraction,true);
  };
 },[musicEnabled]);
 useEffect(()=>()=>{musicControllerRef.current?.dispose();musicControllerRef.current=null},[]);

 useEffect(()=>{if(!supabase)return;refreshPublic();supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)loadAdminData()});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s){setPage('admin');loadAdminData()}else if(page==='admin')setPage('location')});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{
  const metadata={
   location:{title:'Spidy Sells | Tiramisu & Dessert Orders in Kolkata and Howrah',description:'Discover Spidy Sells for rich, coffee-kissed tiramisu and dessert orders in Kolkata and Howrah. Choose a serving location to see available ordering options.'},
   type:{title:'Choose Takeaway or Delivery | Spidy Sells',description:'Choose an available Spidy Sells ordering option for your location in Kolkata or Howrah.'},
   menu:{title:'Tiramisu Menu and Prices | Spidy Sells',description:'Explore the Spidy Sells dessert menu, product details and current prices before placing your order.'},
   cart:{title:'Your Dessert Bag | Spidy Sells',description:'Review the desserts in your Spidy Sells bag before checkout.'},
   checkout:{title:'Checkout | Spidy Sells',description:'Review your Spidy Sells order, pickup location or delivery details, and available payment method.'},
   success:{title:'Order Confirmation | Spidy Sells',description:'Review the details and status of your Spidy Sells order.'},
   owner:{title:'Owner Login | Spidy Sells',description:'Secure owner sign-in for the Spidy Sells store management dashboard.'},
   admin:{title:'Store Management | Spidy Sells',description:'Private Spidy Sells store management dashboard.'},
   'not-found':{title:'Page Not Found | Spidy Sells',description:'This Spidy Sells page could not be found. Return to the store homepage to continue.'}
  };
  const current=metadata[page]||metadata.location;
  const origin='https://spidy-sells.vercel.app';
  const route=pageToRoute[page]||null;
  document.title=current.title;
  const setMeta=(selector,attr,value,content)=>{let node=document.head.querySelector(selector);if(!node){node=document.createElement('meta');node.setAttribute(attr,value);document.head.appendChild(node)}node.setAttribute('content',content)};
  setMeta('meta[name="description"]','name','description',current.description);
  const indexablePage=['location','menu'].includes(page);
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
  const origin='https://spidy-sells.vercel.app';
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
 async function refreshPublic(){
  if(!supabase)return;
  const [pr,br,se]=await Promise.all([supabase.from('products').select('*').eq('published',true).eq('available',true).order('created_at'),supabase.from('branches').select('*').eq('active',true).order('name'),supabase.from('business_settings').select('*').limit(1).maybeSingle()]);
  if(!pr.error)setProducts(pr.data||[]);else setNotice('Menu database is not ready. Apply the Supabase migrations in README.');
  if(!br.error)setBranches(br.data||[]);
  if(!se.error&&se.data)setSettings({...defaultSettings,...se.data});
 }
 async function loadAdminData(){
  if(!supabase)return;setDashboardLoading(true);
  const [o,p,b,s]=await Promise.all([supabase.from('orders').select('*,branches(name),order_items(*)').order('created_at',{ascending:false}).limit(500),supabase.from('products').select('*').order('created_at',{ascending:false}),supabase.from('branches').select('*').order('created_at',{ascending:false}),supabase.from('business_settings').select('*').limit(1).maybeSingle()]);
  if(o.error)setNotice('Orders: '+o.error.message);else setOrders(o.data||[]);
  if(!p.error)setProducts(p.data||[]);
  if(!b.error)setBranches(b.data||[]);
  if(!s.error&&s.data)setSettings({...defaultSettings,...s.data});
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
  await loadCustomerOrderHistory(historyReference,historyPhone,true);
 }
 function chooseLocation(city){const branch=city==='howrah'?branches.find(b=>/howrah|bankra/i.test((b.name||'')+' '+(b.address||''))):branches.find(b=>/park circus|kolkata/i.test((b.name||'')+' '+(b.address||'')));setSelectedBranch(branch?.id||'');setKind('pickup');setPaymentMethod('cash_on_pickup');setNotice('');setPage('type')}
 function add(item){setCart(old=>{const x=old.find(i=>i.id===item.id);return x?old.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i):[...old,{...item,price:Number(item.price),qty:1}]});setNotice('Added to your bag');}
 function changeQty(id,delta){setCart(old=>old.map(i=>i.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0))}
 async function checkout(e){
  e.preventDefault();setNotice('');
  if(!cart.length){setNotice('Your bag is empty. Add a dessert first.');return}
  if(!customer.name.trim()||!/^\+?[0-9\s()-]{8,15}$/.test(customer.phone.trim())||(kind==='delivery'&&!customer.address.trim())){setNotice('Please enter your name, a valid phone number, and delivery address if needed.');return}if(!selectedBranch){setNotice('Please choose Kolkata or Howrah before placing your order.');return}const chosenBranch=branches.find(b=>b.id===selectedBranch);if(!chosenBranch||!chosenBranch.active){setNotice('This store location is unavailable. Please go back and choose a location again.');return}if(kind==='pickup'&&!chosenBranch.takeaway_enabled){setNotice('Takeaway is not available at this location.');return}if(kind==='delivery'&&(!settings.delivery_enabled||!chosenBranch.delivery_enabled)){setNotice('Delivery is not available at this location yet.');return}
  if(!supabase){setNotice('Ordering is not connected yet. Configure Supabase before accepting real orders.');return}
  if(kind==='delivery'&&!settings.delivery_enabled){setNotice('Online delivery is not enabled yet. Please choose takeaway.');return}
  if(kind==='delivery'&&!matchingDeliveryQuote){setNotice(quoteError||(quoteBusy?'Please wait while we calculate the delivery charge.':'Enter your full delivery address so we can calculate the delivery charge.'));return}
  setBusy(true);
  try{
   const {data,error}=await supabase.functions.invoke('spidy-order-api',{body:{action:'place_order',kind,branchId:selectedBranch,name:customer.name.trim(),phone:customer.phone.trim(),address:kind==='delivery'?customer.address.trim():null,notes:customer.notes.trim()||null,items:cart.map(i=>({product_id:i.id,quantity:i.qty}))}});
   if(error)throw error;
   if(!data?.ok)throw new Error(data?.message||'We could not record this order. Please retry.');
   const ref=data.order_reference||data.id;const placed={...data,customer_phone:customer.phone.trim(),customer_name:customer.name.trim(),order_type:kind==='pickup'?'TAKEAWAY':'ONLINE DELIVERY',delivery_address:kind==='delivery'?customer.address.trim():null,branch_id:selectedBranch,branch_name:branches.find(b=>b.id===selectedBranch)?.name||'Selected location',branch_address:branches.find(b=>b.id===selectedBranch)?.address||'',items:data.items||cart.map(i=>({product_name_snapshot:i.name,quantity:i.qty,unit_price:i.price,line_total:i.price*i.qty})),status:data.status||'confirmed',payment_method:paymentMethod,payment_status:data.payment_status||'pending'};
   setOrderRef(ref);setOrderDetails(placed);setActiveOrder(placed);window.localStorage.setItem('spidy_active_order',JSON.stringify({order_reference:ref,customer_phone:customer.phone.trim()}));setPage('success');setNotice('');setCart([]);
  }catch(err){setNotice(err.message||'We could not record this order. Please retry.')}finally{setBusy(false)}
 }
 async function login(e){e.preventDefault();if(!supabase){setNotice('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');return}setBusy(true);const email=e.currentTarget.email.value.trim();const {data,error}=await supabase.auth.signInWithPassword({email,password:e.currentTarget.password.value});if(error){setBusy(false);setNotice(error.message);return}const {data:admin,error:adminError}=await supabase.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();if(adminError||!admin){await supabase.auth.signOut();setBusy(false);setNotice('This account is not approved for the admin panel yet.');return}setBusy(false);setNotice('');setSession(data.session);setPage('admin');await loadAdminData()}
 async function logout(){await supabase?.auth.signOut();setSession(null);setPage('location')}
 async function updateStatus(order,status){const {error}=await supabase.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',order.id);if(error)setNotice(error.message);else{await supabase.from('order_status_history').insert({order_id:order.id,old_status:order.status,new_status:status,changed_by:session?.user?.id});await supabase.from('audit_events').insert({actor_id:session?.user?.id,action:'order_status_changed',details:{order_reference:order.order_reference,from:order.status,to:status}});await loadAdminData()}}
 async function saveProduct(e){e.preventDefault();const f=new FormData(e.currentTarget);const row={name:String(f.get('name')).trim(),description:String(f.get('description')).trim(),price:Number(f.get('price')),image_url:String(f.get('image_url')).trim()||null,published:f.get('published')==='on',available:f.get('available')==='on',updated_at:new Date().toISOString()};if(!row.name||row.price<0){setNotice('Enter a product name and valid price.');return}const result=editingProduct?.id?await supabase.from('products').update(row).eq('id',editingProduct.id):await supabase.from('products').insert(row);if(result.error)setNotice(result.error.message);else{setNotice('Product saved.');setEditingProduct(null);await loadAdminData()}}
 async function deleteProduct(p){if(!window.confirm('Remove '+p.name+' from the menu? Existing order records will be retained.'))return;const {error}=await supabase.from('products').delete().eq('id',p.id);if(error)setNotice(error.message);else await loadAdminData()}
 async function saveBranch(e){e.preventDefault();const f=new FormData(e.currentTarget);const row={name:String(f.get('name')).trim(),address:String(f.get('address')).trim(),contact_phone:String(f.get('contact_phone')).trim(),google_maps_url:String(f.get('google_maps_url')).trim()||null,active:f.get('active')==='on',takeaway_enabled:f.get('takeaway_enabled')==='on',delivery_enabled:f.get('delivery_enabled')==='on',updated_at:new Date().toISOString()};if(!row.name||!row.address){setNotice('Branch name and address are required.');return}const result=editingBranch?.id?await supabase.from('branches').update(row).eq('id',editingBranch.id):await supabase.from('branches').insert(row);if(result.error)setNotice(result.error.message);else{setNotice('Branch saved.');setEditingBranch(null);await loadAdminData()}}
 async function deleteBranch(b){if(!window.confirm('Remove branch '+b.name+'? Existing orders will retain their recorded branch name.'))return;const {error}=await supabase.from('branches').delete().eq('id',b.id);if(error)setNotice(error.message);else await loadAdminData()}
 async function saveSettings(e){e.preventDefault();const f=new FormData(e.currentTarget);const row={business_name:String(f.get('business_name')).trim(),whatsapp_number:String(f.get('whatsapp_number')).replace(/[^0-9]/g,''),delivery_enabled:f.get('delivery_enabled')==='on',delivery_charge:Number(f.get('delivery_charge')||0),pickup_instructions:String(f.get('pickup_instructions')).trim(),updated_at:new Date().toISOString()};if(row.whatsapp_number.length<10){setNotice('Enter the WhatsApp number including country code.');return}let result;if(settings.id)result=await supabase.from('business_settings').update(row).eq('id',settings.id);else result=await supabase.from('business_settings').insert(row);if(result.error)setNotice(result.error.message);else{setNotice('Settings saved.');await loadAdminData()}}
 async function changePassword(e){e.preventDefault();if(passwords.next.length<10){setNotice('Use at least 10 characters for the new password.');return}if(passwords.next!==passwords.confirm){setNotice('The passwords do not match.');return}const {error}=await supabase.auth.updateUser({password:passwords.next});if(error)setNotice(error.message);else{setNotice('Password updated successfully.');setPasswords({next:'',confirm:''});e.currentTarget.reset()}}
 async function resetOrders(e){e.preventDefault();if(resetText!=='RESET ALL ORDERS'){setNotice('Type RESET ALL ORDERS exactly to continue.');return}if(!window.confirm('This permanently deletes all order records and their items. Continue?'))return;const {data,error}=await supabase.rpc('admin_reset_orders',{p_confirmation:resetText});if(error)setNotice(error.message);else{setNotice('Reset complete. '+data+' orders deleted.');setResetText('');await loadAdminData()}}
 function finishIntro(){try{window.sessionStorage.setItem('spidy-intro-seen','1')}catch{}setIntroPlaying(false)}
 const completedSales=orders.filter(o=>o.status==='completed').reduce((s,o)=>s+Number(o.total||0),0);
 const converted=orders.filter(o=>['confirmed','preparing','ready_for_pickup','out_for_delivery','completed'].includes(o.status)).length;
 const unconverted=orders.filter(o=>['not_converted','cancelled'].includes(o.status)).length;
 const breadcrumbMap={
  type:[{label:'Home',target:'location'},{label:'Order type'}],
  menu:[{label:'Home',target:'location'},{label:'Order type',target:'type'},{label:'Menu'}],
  cart:[{label:'Home',target:'location'},{label:'Menu',target:'menu'},{label:'Bag'}],
  checkout:[{label:'Home',target:'location'},{label:'Menu',target:'menu'},{label:'Bag',target:'cart'},{label:'Checkout'}],
  success:[{label:'Home',target:'location'},{label:'Order confirmation'}],
  owner:[{label:'Home',target:'location'},{label:'Owner login'}],
  admin:[{label:'Home',target:'location'},{label:'Owner dashboard'}]
 };
 const breadcrumbs=breadcrumbMap[page]||[];
 return <div className="site"><div className="site-content" inert={introPlaying ? '' : undefined} aria-hidden={introPlaying || undefined}>
 <header className="header"><a className="brand" href="/" onClick={e=>{e.preventDefault();setPage('location')}} aria-label="Spidy Sells home"><img className="brand-logo" src={spidySellsLogo} alt="Spidy Sells logo" /></a><div className="header-right">{['menu','cart','checkout'].includes(page)&&cart.length>0&&<button className="bag" onClick={()=>setPage('cart')}><ShoppingBag size={17}/> Bag <i>{cart.reduce((s,i)=>s+i.qty,0)}</i></button>}{page==='admin'&&<button className="owner" onClick={logout}><LogOut size={14} style={{verticalAlign:'middle'}}/> Log out</button>}</div></header>
 {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
 {breadcrumbs.length>0&&<nav className="breadcrumbs" aria-label="Breadcrumb"><ol>{breadcrumbs.map((crumb,index)=><li key={crumb.label} aria-current={index===breadcrumbs.length-1?'page':undefined}>{crumb.target?<a href={pageToRoute[crumb.target]||'/'} onClick={e=>{e.preventDefault();setPage(crumb.target)}}>{crumb.label}</a>:<span>{crumb.label}</span>}</li>)}</ol></nav>}
 {page==='not-found'&&<main className="content narrow page-not-found"><div className="kicker">ERROR 404</div><h1>This page has<br/><em>gone missing.</em></h1><p className="lead">The link may be old, or the page may have moved. Let’s get you back to the Spidy Sells store.</p><a className="primary" href="/" onClick={e=>{e.preventDefault();window.history.pushState({},'','/');setPage('location')}}>Back to the store <ArrowRight size={16}/></a></main>}
 {page==='location'&&<main className="hero location"><div className="kicker">✦ GOOD FOOD, GREAT MOOD ✦</div><h1>Where are<br/>you <em>from?</em></h1><p className="lead">Your next little moment of happiness starts here.</p><div className="location-options"><button className="location-card" onClick={()=>chooseLocation('kolkata')}><span className="round-icon"><MapPin/></span><span><b>Kolkata</b><small>Serving Kolkata & nearby areas</small></span><ArrowRight className="right-arrow"/></button><button className="location-card" onClick={()=>chooseLocation('howrah')}><span className="round-icon"><MapPin/></span><span><b>Howrah</b><small>Serving Howrah & nearby areas</small></span><ArrowRight className="right-arrow"/></button></div><section className="customer-order-history"><div className="customer-history-heading"><div className="kicker">SPIDY SELLS</div><h2>Your order history</h2><p>Use a recent order reference and the phone number used at checkout to see all orders linked to that number.</p></div><form className="customer-history-form" onSubmit={searchCustomerOrderHistory}><label>Recent order reference<input required value={historyReference} onChange={e=>setHistoryReference(e.target.value)} placeholder="e.g. SS-39E901A82D" autoComplete="off"/></label><label>Phone number used at checkout<input required type="tel" inputMode="tel" value={historyPhone} onChange={e=>setHistoryPhone(e.target.value)} placeholder="Your checkout phone number" autoComplete="tel"/></label><button className="primary full" type="submit" disabled={customerHistoryLoading||!historyReference.trim()||!historyPhone.trim()}>{customerHistoryLoading?'Finding orders…':'View my orders'} <ArrowRight size={15}/></button></form>{customerHistoryMessage&&<p className={`customer-history-message ${customerOrderHistory.length?'':'customer-history-error'}`} role="status">{customerHistoryMessage}</p>}{customerHistoryLoading&&<p className="customer-history-loading">Loading your orders…</p>}{customerHistorySearched&&customerOrderHistory.length>0&&<div className="customer-history-list">{customerOrderHistory.map(order=><article className="home-active-order customer-history-order" key={order.id||order.order_reference}><div className="active-order-heading"><h3>Order {order.order_reference}</h3><span className="order-status-pill">{pretty(order.status||'confirmed')}</span></div><div className="customer-history-meta"><span>{new Date(order.created_at).toLocaleString('en-IN')}</span><span>{order.order_type==='TAKEAWAY'?'Takeaway':'Delivery'} · {order.branch_name||'Spidy Sells'}</span></div><p>{(order.items||[]).map(i=>(i.product_name_snapshot||i.name)+' × '+i.quantity).join(' · ')||'Your dessert order'}</p><div className="active-order-bottom"><b>{rupees(order.total||0)}</b><button onClick={()=>{setOrderRef(order.order_reference);setOrderDetails({...order,customer_phone:historyPhone});setPage('success')}}>View details <ArrowRight size={14}/></button></div></article>)}</div>}</section><div className="hero-foot"><span>MADE WITH LOVE</span><span>✦</span><span>KOLKATA &amp; HOWRAH, INDIA</span></div></main>}
 {page==='type'&&<main className="content"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Change location</button><div className="kicker">HELLO, {selectedCity}</div><h1>How would you<br/><em>like your treat?</em></h1><p className="lead">Choose what works best for you.</p><div className="type-grid"><button className="type-card" onClick={()=>{setKind('pickup');setPaymentMethod('cash_on_pickup');setPage('menu')}}><div className="type-icon"><ShoppingBag/></div><span className="card-kicker">ORDER AHEAD</span><h2>Takeaway</h2><p>Pick up your dessert from an available branch. Place your order ahead and we'll get it ready for you.</p><span className="text-link">Choose takeaway <ArrowRight size={16}/></span></button><button className="type-card" onClick={()=>{const branch=branches.find(b=>b.id===selectedBranch);if(settings.delivery_enabled&&branch?.delivery_enabled){setKind('delivery');setPaymentMethod('cash_on_delivery');setPage('menu')}else setNotice('Delivery is not enabled at this location yet. Please choose another location or takeaway.')}}><div className="type-icon gold"><MapPin/></div><span className="card-kicker">AT YOUR DOOR</span><h2>Online order</h2><p>Have your dessert delivered to your address, where delivery is available.</p><span className="text-link">{settings.delivery_enabled?'Choose delivery':'COMING SOON'} <ArrowRight size={16}/></span></button></div></main>}
 {page==='menu'&&<main className="content"><button className="back" onClick={()=>setPage('type')}><ArrowLeft size={16}/> Change order type</button><div className="kicker">THE MENU · {selectedCity}</div><h1>A little cup of<br/><em>happiness.</em></h1><p className="lead">Made for slow moments and sweet cravings.</p><div className="menu-products">{products.filter(p=>p.published!==false&&p.available!==false).map(p=><article className="product" key={p.id}><div className="product-photo">{p.image_url?<img src={p.image_url} alt={p.name+' dessert' } loading="lazy"/>:<div className="product-photo-empty" role="img" aria-label={p.name+' photo unavailable'}><ChefHat size={42} aria-hidden="true"/></div>}<span>SPIDY FAVOURITE</span></div><div className="product-details"><div><span className="card-kicker">A LITTLE JOY</span><h2>{p.name}</h2><p>{p.description}</p></div><strong>{rupees(p.price)}</strong></div><button className="add" onClick={()=>add(p)}>Add to bag <Plus size={18}/></button></article>)}</div>{!products.length&&<p>Our menu is being prepared. Please check back soon.</p>}{cart.length>0&&<button className="primary sticky" onClick={()=>setPage('cart')}><ShoppingBag size={18}/> View bag · {rupees(total)} <ArrowRight size={17}/></button>}</main>}
 {page==='cart'&&<main className="content narrow"><button className="back" onClick={()=>setPage('menu')}><ArrowLeft size={16}/> Back to menu</button><div className="kicker">YOUR SELECTION</div><h1>Your <em>bag.</em></h1>{!cart.length?<div className="empty"><ShoppingBag size={30}/><h2>Nothing in your bag just yet.</h2><button className="primary" onClick={()=>setPage('menu')}>Explore the menu <ArrowRight size={17}/></button></div>:<><div className="cart-list">{cart.map(i=><div className="cart-row" key={i.id}>{i.image_url?<img src={i.image_url} alt="" loading="lazy"/>:<div className="cart-image-empty" aria-hidden="true"><ChefHat size={20}/></div>}<div className="cart-name"><b>{i.name}</b><small>{rupees(i.price)} each</small><div className="qty"><button onClick={()=>changeQty(i.id,-1)} aria-label="Decrease"><Minus size={14}/></button><span>{i.qty}</span><button onClick={()=>changeQty(i.id,1)} aria-label="Increase"><Plus size={14}/></button></div></div><b>{rupees(i.price*i.qty)}</b></div>)}</div><div className="total"><span>Subtotal</span><b>{rupees(total)}</b></div><button className="primary full" onClick={()=>setPage('checkout')}>Continue to checkout <ArrowRight size={17}/></button></>}</main>}
 {page==='checkout'&&<main className="content narrow"><button className="back" onClick={()=>setPage('cart')}><ArrowLeft size={16}/> Back to bag</button><div className="kicker">ALMOST YOURS</div><h1>Make it <em>happen.</em></h1><p className="lead">{kind==='pickup'?'Takeaway order':'Delivery order'} · {branches.find(b=>b.id===selectedBranch)?.name||'Selected location'}</p><form className="form" onSubmit={checkout}><label>Your name *<input required value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="What should we call you?"/></label><label>Phone number *<input required inputMode="tel" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="Your contact number"/></label>{kind==='delivery'?<><label>Full delivery address *<textarea required value={customer.address} onChange={e=>{setCustomer({...customer,address:e.target.value});setDeliveryLookupRequested(false);setDeliveryQuote(null);setQuoteError('')}} onBlur={()=>setDeliveryLookupRequested(true)} placeholder="House, street, area, landmark, PIN code"/></label></>:null}{kind==='delivery'&&<div className="delivery-quote" aria-live="polite">{quoteBusy?<small>Calculating driving distance…</small>:matchingDeliveryQuote?<><div><span>Driving distance</span><b>{Number(matchingDeliveryQuote.distanceKm).toFixed(1)} km</b></div><div><span>Delivery charge</span><b>{rupees(deliveryFee)}</b></div>{matchingDeliveryQuote.distanceApproximate&&<small className="quote-error">Approximate distance: Geoapify matched the PIN-code area rather than the exact address point. Add a street or nearby landmark for a more accurate quote.</small>}<small>₹60 up to 10 km · ₹90 up to 20 km · beyond 20 km, ₹90 + ₹3 per additional km (rounded up).</small><small className="routing-attribution">Routing by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · Map data © OpenStreetMap contributors</small></>:quoteError?<small className="quote-error">{quoteError}</small>:<small>Enter your full address, including area and PIN code. We’ll calculate the driving distance and delivery charge automatically.</small>}</div>}<div className="selected-branch-summary"><b>{kind==='pickup'?'Takeaway location':'Delivery from'}</b><span>{branches.find(b=>b.id===selectedBranch)?.name||'Selected location'}</span><small>{branches.find(b=>b.id===selectedBranch)?.address||'Please select your store location first.'}</small></div>{kind==='pickup'&&branches.find(b=>b.id===selectedBranch)?.address&&<section className="branch-map-card" aria-label="Takeaway pickup map"><div className="branch-map-heading"><div><b>Find your pickup location</b><small>{branches.find(b=>b.id===selectedBranch)?.address}</small></div><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branches.find(b=>b.id===selectedBranch)?.address||'')}`} target="_blank" rel="noreferrer">Get directions <ArrowRight size={14}/></a></div><iframe title={`Map to ${branches.find(b=>b.id===selectedBranch)?.name||'takeaway branch'}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(branches.find(b=>b.id===selectedBranch)?.address||'')}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/></section>}<label>Order notes (optional)<textarea value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})} placeholder="Anything we should know?"/></label><div className="payment-methods"><p className="payment-title">Payment method</p><label className="payment-option"><input type="radio" name="paymentMethod" checked={paymentMethod===(kind==='pickup'?'cash_on_pickup':'cash_on_delivery')} onChange={()=>setPaymentMethod(kind==='pickup'?'cash_on_pickup':'cash_on_delivery')}/><span><b>{kind==='pickup'?'Pay at takeaway':'Cash on delivery'}</b><small>{kind==='pickup'?'Pay when you collect your order.':'Pay when your order arrives.'}</small></span></label><label className="payment-option payment-disabled" aria-disabled="true" title="Online payments are disabled for now"><input type="radio" name="paymentMethod" checked={paymentMethod==='online'} disabled/><span><b>Pay now · Coming soon</b><small>{kind==='pickup'?'Hassle-free takeaway with online payment.':'Hassle-free delivery with online payment.'} Online payments are disabled for now.</small></span></label></div><div className="summary"><h3>Order summary</h3>{cart.map(i=><div className="sumline" key={i.id}><span>{i.name} × {i.qty}</span><span>{rupees(i.price*i.qty)}</span></div>)}<div className="sumline"><span>Subtotal</span><span>{rupees(total)}</span></div>{deliveryFee>0&&<div className="sumline"><span>Delivery</span><span>{rupees(deliveryFee)}</span></div>}<div className="sumline sum-total"><b>Total</b><b>{rupees(total+deliveryFee)}</b></div><small>{settings.pickup_instructions||'Your order will be prepared after confirmation.'}</small></div><button className="primary full" disabled={busy||!cart.length||(kind==='delivery'&&(!matchingDeliveryQuote||quoteBusy))}>{busy?'Placing order…':'Place order'} <ArrowRight size={17}/></button></form></main>}
 {page==='success'&&<main className="content narrow success"><div className="success-icon"><Check/></div><div className="kicker">THANK YOU</div><h1>{orderDetails?.status==='completed'?<>Order <br/><em>completed.</em></>:orderDetails?.status==='cancelled'?<>Order <br/><em>cancelled.</em></>:<>Your order is<br/><em>confirmed.</em></>}</h1><p className="lead">Order reference <b>{orderDetails?.order_reference||orderRef}</b>. {orderDetails?.status==='completed'?'This order has been completed.':orderDetails?.status==='cancelled'?'This order was cancelled.':'Thanks for choosing Spidy Sells! We’ve received your order and will contact you if we need any details.'}</p><div className="summary order-confirmation"><h3>Order details</h3><div className="sumline"><span>Status</span><b>{pretty(orderDetails?.status||'confirmed')}</b></div><div className="sumline"><span>Order type</span><b>{orderDetails?.order_type==='TAKEAWAY'?'Takeaway':'Online delivery'}</b></div><div className="sumline"><span>Location</span><b>{orderDetails?.branch_name||'Selected location'}</b></div>{(orderDetails?.items||[]).map((i,idx)=><div className="sumline" key={i.id||idx}><span>{i.product_name_snapshot||i.name} × {i.quantity||i.qty}</span><span>{rupees(i.line_total??Number(i.unit_price||i.price||0)*Number(i.quantity||i.qty||1))}</span></div>)}{orderDetails?.delivery_address&&<div className="sumline"><span>Delivery address</span><span>{orderDetails.delivery_address}</span></div>}{Number(orderDetails?.delivery_distance_km||0)>0&&<div className="sumline"><span>Driving distance</span><span>{Number(orderDetails.delivery_distance_km).toFixed(1)} km</span></div>}<div className="sumline"><span>Subtotal</span><span>{rupees(orderDetails?.subtotal??orderDetails?.total??0)}</span></div>{Number(orderDetails?.delivery_charge||0)>0&&<div className="sumline"><span>Delivery charge</span><span>{rupees(orderDetails.delivery_charge)}</span></div>}<div className="sumline sum-total"><b>Total</b><b>{rupees(orderDetails?.total||0)}</b></div><div className="sumline"><span>Payment</span><b>{orderDetails?.payment_method==='cash_on_pickup'?'Pay at takeaway':orderDetails?.payment_method==='online'?'Pay online':'Cash on delivery'}</b></div><div className="payment-option payment-disabled confirmation-payment-option" aria-disabled="true" title="Online payments are disabled for now"><input type="radio" name="confirmationPaymentMethod" disabled/><span><b>Pay now · Coming soon</b><small>{orderDetails?.order_type==='TAKEAWAY'?'Hassle-free takeaway with online payment.':'Hassle-free delivery with online payment.'} Online payments are disabled for now.</small></span></div><small>Your order status will appear on the homepage until the order is completed.</small></div>{orderDetails?.order_type==='TAKEAWAY'&&(()=>{const branchAddress=orderDetails?.branch_address||branches.find(b=>b.id===orderDetails?.branch_id)?.address||branches.find(b=>b.name===orderDetails?.branch_name)?.address||'';return branchAddress?<section className="branch-map-card confirmation-branch-map" aria-label="Takeaway pickup map"><div className="branch-map-heading"><div><b>Pickup location map</b><small>{branchAddress}</small></div><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branchAddress)}`} target="_blank" rel="noreferrer">Get directions <ArrowRight size={14}/></a></div><iframe title={`Map to ${orderDetails?.branch_name||'takeaway branch'}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(branchAddress)}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/><a className="primary full confirmation-directions-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branchAddress)}`} target="_blank" rel="noreferrer">Get direction <ArrowRight size={17}/></a></section>:null})()}<button className="back" style={{marginTop:24}} onClick={()=>{setCustomer(emptyCustomer);setPage('location')}}>Back to home</button></main>}
 {page==='owner'&&!session&&<main className="content narrow"><button className="back" onClick={()=>setPage('location')}><ArrowLeft size={16}/> Back to store</button><div className="kicker">PRIVATE AREA</div><h1>Owner <em>login.</em></h1><form className="form" onSubmit={login}><label>Owner email<input name="email" type="email" autoComplete="username" required placeholder="Enter your admin email"/></label><label>Admin password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your admin password"/></label><button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in securely'} <ArrowRight size={17}/></button></form><p className="fine-print">Use the email and password you create for the owner in Supabase Authentication. Only accounts explicitly approved in the admin allowlist can access store management. No SMS provider is needed for email/password login.</p></main>}
 {page==='admin'&&session&&<main className="content admin-page"><div className="admin-heading"><div><div className="kicker">SPIDY SELLS · MANAGEMENT</div><h1>Your store,<br/><em>your way.</em></h1></div><button className="outline-button" onClick={logout}><LogOut size={15}/> Log out</button></div><div className="admin-tabs">{[{id:'orders',label:'Orders',icon:ShoppingBag},{id:'products',label:'Products',icon:Package},{id:'branches',label:'Branches',icon:Store},{id:'settings',label:'Settings',icon:Settings}].map(t=><button key={t.id} className={tab===t.id?'selected':''} onClick={()=>{setTab(t.id);setNotice('')}}><t.icon size={15}/>{t.label}</button>)}</div>
 {tab==='orders'&&<><div className="stats-grid"><div><small>Total order inquiries</small><b>{orders.length}</b></div><div><small>Completed sales</small><b>{rupees(completedSales)}</b></div><div><small>Converted orders</small><b>{converted}</b></div><div><small>Not converted / cancelled</small><b>{unconverted}</b></div></div><div className="section-heading"><h2>Order management</h2><button className="outline-button" onClick={loadAdminData} disabled={dashboardLoading}><RefreshCw size={14}/> {dashboardLoading?'Loading…':'Refresh'}</button></div><p className="fine-print order-history-count" role="status">{dashboardLoading?'Loading all saved orders…':`Showing all ${orders.length} saved orders, newest first.`}</p><div className="table-wrap"><table><thead><tr><th>Order / date</th><th>Customer</th><th>Type</th><th>Total</th><th>Payment</th><th>Conversion status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><b>{o.order_reference}</b><small>{new Date(o.created_at).toLocaleString('en-IN')}</small></td><td>{o.customer_name}<small>{o.customer_phone}</small></td><td>{pretty(o.order_type)}</td><td>{rupees(o.total)}</td><td><b>{o.payment_method==='online'?'Pay online':o.payment_method==='cash_on_pickup'?'Pay at takeaway':'Cash on delivery'}</b><small>{pretty(o.payment_status||'pending')}</small></td><td><select value={o.status} onChange={e=>updateStatus(o,e.target.value)}>{statusOptions.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></td></tr>)}</tbody></table>{!orders.length&&<p className="empty-table">{dashboardLoading?'Loading orders…':'No orders recorded yet.'}</p>}</div><p className="fine-print">Sales totals include orders marked Completed. New orders are stored in this admin panel; COD remains unpaid until received.</p></>}
 {tab==='products'&&<><div className="section-heading"><h2>Menu products</h2><button className="primary small-button" onClick={()=>setEditingProduct({name:'',description:'',price:0,image_url:'',published:true,available:true})}><Plus size={15}/> Add product</button></div>{editingProduct&&<form className="admin-form" onSubmit={saveProduct}><h3>{editingProduct.id?'Edit product':'New product'}</h3><label>Product name<input name="name" required defaultValue={editingProduct.name}/></label><label>Description<textarea name="description" defaultValue={editingProduct.description}/></label><label>Price in ₹<input name="price" type="number" min="0" step="1" required defaultValue={editingProduct.price}/></label><label>Image URL<input name="image_url" type="url" defaultValue={editingProduct.image_url||''} placeholder="https://…"/></label><label className="check-label"><input name="published" type="checkbox" defaultChecked={editingProduct.published}/> Published on storefront</label><label className="check-label"><input name="available" type="checkbox" defaultChecked={editingProduct.available}/> Available to order</label><div className="inline-actions"><button className="primary small-button">Save product</button><button type="button" className="outline-button" onClick={()=>setEditingProduct(null)}>Cancel</button></div></form>}<div className="admin-cards">{products.map(p=><article className="manage-card" key={p.id}>{p.image_url?<img src={p.image_url} alt="" loading="lazy"/>:<div className="manage-product-image-empty" aria-hidden="true"><Package size={24}/></div>}<div className="manage-card-body"><b>{p.name}</b><span>{rupees(p.price)}</span><small>{p.published?'Published':'Hidden'} · {p.available?'Available':'Unavailable'}</small><div className="inline-actions"><button className="outline-button" onClick={()=>setEditingProduct(p)}><Pencil size={14}/> Edit</button><button className="danger-outline" onClick={()=>deleteProduct(p)}><Trash2 size={14}/> Remove</button></div></div></article>)}</div></>}
 {tab==='branches'&&<><div className="section-heading"><h2>Branch locations</h2><button className="primary small-button" onClick={()=>setEditingBranch({name:'',address:'',contact_phone:'',google_maps_url:'',active:true,takeaway_enabled:true,delivery_enabled:false})}><Plus size={15}/> Add branch</button></div>{editingBranch&&<form className="admin-form" onSubmit={saveBranch}><h3>{editingBranch.id?'Edit branch':'New branch'}</h3><label>Branch name<input name="name" required defaultValue={editingBranch.name}/></label><label>Full address<input name="address" required defaultValue={editingBranch.address}/></label><label>Contact phone<input name="contact_phone" defaultValue={editingBranch.contact_phone}/></label><label>Google Maps link<input name="google_maps_url" type="url" defaultValue={editingBranch.google_maps_url||''}/></label><label className="check-label"><input name="active" type="checkbox" defaultChecked={editingBranch.active}/> Active / visible to customers</label><label className="check-label"><input name="takeaway_enabled" type="checkbox" defaultChecked={editingBranch.takeaway_enabled}/> Accept takeaway orders</label><label className="check-label"><input name="delivery_enabled" type="checkbox" defaultChecked={editingBranch.delivery_enabled}/> Delivery available from this branch</label><div className="inline-actions"><button className="primary small-button">Save branch</button><button type="button" className="outline-button" onClick={()=>setEditingBranch(null)}>Cancel</button></div></form>}<div className="admin-cards">{branches.map(b=><article className="manage-card branch-card" key={b.id}><div className="branch-symbol"><MapPin/></div><div className="manage-card-body"><b>{b.name}</b><span>{b.address}</span><small>{b.active?'Active':'Inactive'} · Takeaway {b.takeaway_enabled?'on':'off'} · Delivery {b.delivery_enabled?'on':'off'}</small>{b.google_maps_url&&<a href={b.google_maps_url} target="_blank" rel="noreferrer">Open map <ExternalLink size={13}/></a>}<div className="inline-actions"><button className="outline-button" onClick={()=>setEditingBranch(b)}><Pencil size={14}/> Edit</button><button className="danger-outline" onClick={()=>deleteBranch(b)}><Trash2 size={14}/> Remove</button></div></div></article>)}{!branches.length&&<p className="empty-table">No branches configured yet. Add a verified location to show it to customers.</p>}</div></>}
 {tab==='settings'&&<><div className="section-heading"><h2>Store settings</h2></div><form className="admin-form" onSubmit={saveSettings}><label>Store name<input name="business_name" required defaultValue={settings.business_name}/></label><label>WhatsApp number with country code<input name="whatsapp_number" required defaultValue={settings.whatsapp_number}/></label><label>Delivery charge in ₹<input name="delivery_charge" type="number" min="0" step="1" defaultValue={settings.delivery_charge}/></label><label>Customer checkout instructions<textarea name="pickup_instructions" defaultValue={settings.pickup_instructions||''}/></label><label className="check-label"><input name="delivery_enabled" type="checkbox" defaultChecked={settings.delivery_enabled}/> Enable online delivery checkout</label><button className="primary small-button">Save settings</button></form><form className="admin-form" onSubmit={changePassword}><h3><LockKeyhole size={17}/> Change password</h3><label>New password<input type="password" minLength="10" required value={passwords.next} onChange={e=>setPasswords({...passwords,next:e.target.value})}/></label><label>Confirm new password<input type="password" minLength="10" required value={passwords.confirm} onChange={e=>setPasswords({...passwords,confirm:e.target.value})}/></label><button className="primary small-button">Update password</button></form><form className="admin-form destructive" onSubmit={resetOrders}><h3>Reset all order records</h3><p>This permanently deletes all orders and order items. It records an audit event. This cannot be undone.</p><label>Type RESET ALL ORDERS to confirm<input value={resetText} onChange={e=>setResetText(e.target.value)} placeholder="RESET ALL ORDERS"/></label><button className="danger-button" disabled={resetText!=='RESET ALL ORDERS'}>Reset all orders</button></form></>}
 </main>}
 <footer className="footer"><div className="footer-brand"><img className="footer-logo" src={spidySellsLogo} alt="Spidy Sells logo" /></div><p>Small moments. Beautiful desserts.</p><nav className="footer-nav" aria-label="Footer links"><a href="/">Home</a><a href="/admin">Owner login</a></nav><div className="copyright">© {new Date().getFullYear()} Spidy Sells · Kolkata, India</div></footer>
 </div>{introPlaying&&<SpiderWelcomeIntro onSkip={finishIntro}/>}<div className={`ambient-music-control ${musicStarted&&musicEnabled?'is-playing':''}`} aria-label="Background music controls"><button type="button" className="ambient-music-toggle" onClick={toggleSpookyMusic} aria-label={musicStarted&&musicEnabled?'Turn spooky music off':'Turn spooky music on'} title={musicStarted&&musicEnabled?'Turn spooky music off':'Turn spooky music on'}>{musicStarted&&musicEnabled?<Volume2 size={16}/>:musicEnabled?<Music2 size={16}/>:<VolumeX size={16}/>}<span>{musicStarted&&musicEnabled?'Spooky ambience on':musicEnabled?'Enable spooky music':'Spooky music off'}</span></button><label className="ambient-volume" title="Background music volume"><Volume2 size={13}/><input type="range" min="0" max="0.36" step="0.01" value={musicVolume} onChange={event=>{const value=Number(event.target.value);musicVolumeRef.current=value;setMusicVolume(value);musicControllerRef.current?.setVolume(musicEnabledRef.current&&musicStarted?value:0)}} aria-label="Background music volume"/></label><span className="ambient-sr-only" role="status" aria-live="polite">{musicStarted&&musicEnabled?'Spooky background music playing':musicEnabled?'Spooky background music will start after your first interaction':'Spooky background music muted'}</span></div></div>
}