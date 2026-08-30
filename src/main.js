import './styles.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

// Reveal individual elements
const reveals = document.querySelectorAll('.reveal');
if (!reduced && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  reveals.forEach((el) => io.observe(el));
} else reveals.forEach((el) => el.classList.add('visible'));

// Section-level scroll staging. Everything after the hero remains visually
// concealed until the viewport is actually approaching that section.
const stagedSections = [...document.querySelectorAll('main > .section-shell:not(#home)')];
if (!reduced && 'IntersectionObserver' in window) {
  stagedSections.forEach((section, index) => {
    section.classList.add('section-pending');
    section.style.setProperty('--section-order', String(index));
  });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('section-visible');
      entry.target.classList.remove('section-pending');
      sectionObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -10% 0px'
  });

  stagedSections.forEach((section) => sectionObserver.observe(section));
} else {
  stagedSections.forEach((section) => section.classList.add('section-visible'));
}

// Mobile nav
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('open')));
}

// Progress and active nav
const progress = document.getElementById('scrollProgress');
const navAnchors = [...document.querySelectorAll('.nav-links a')];
const sections = navAnchors.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
function scrollUI(){
  const d=document.documentElement, max=d.scrollHeight-innerHeight;
  if(progress) progress.style.width=`${max>0 ? scrollY/max*100 : 0}%`;
  let current=sections[0];
  for(const sec of sections){ if(sec.getBoundingClientRect().top < innerHeight*.42) current=sec; }
  navAnchors.forEach(a=>a.classList.toggle('active', current && a.getAttribute('href')===`#${current.id}`));
}
addEventListener('scroll',scrollUI,{passive:true}); scrollUI();

// Back-to-top chrome orb, appears after leaving the hero
const toTop = document.getElementById('toTop');
if (toTop) {
  addEventListener('scroll', () => {
    toTop.classList.toggle('visible', scrollY > innerHeight * 0.6);
  }, { passive: true });
}

// Cursor light
if(!reduced && finePointer){
  const glow=document.querySelector('.cursor-glow');
  addEventListener('pointermove',(e)=>{ if(glow){glow.style.left=`${e.clientX}px`;glow.style.top=`${e.clientY}px`;}},{passive:true});
}

// Mini chrome planets for process and skill cards
[...document.querySelectorAll('.process-step, .stack-row')].forEach((el)=>{
  if(!el.querySelector('.mini-planet')){
    const p=document.createElement('span'); p.className='mini-planet'; p.setAttribute('aria-hidden','true'); el.appendChild(p);
  }
});

// Project deck — physical layered stack with deterministic Z-space choreography.
const cards=[...document.querySelectorAll('.project-deck .flagship')];
const deck=document.querySelector('.project-deck');
let selectedIndex=0;

function renderDeck(index, animate=true){
  if(!cards.length) return;
  selectedIndex=(index+cards.length)%cards.length;
  cards.forEach((card,i)=>{
    const delta=i-selectedIndex;
    const distance=Math.abs(delta);
    const side=delta===0?0:(delta>0?1:-1);
    const active=i===selectedIndex;
    card.classList.toggle('deck-selected',active);
    card.setAttribute('aria-pressed',String(active));
    card.style.setProperty('--deck-distance',String(distance));
    card.style.setProperty('--deck-x',String(side*(24+distance*13)));
    card.style.setProperty('--deck-y',String(distance*(14+distance*2)));
    card.style.setProperty('--deck-z',String(-distance*58));
    card.style.setProperty('--deck-r',String(side*(1.35+distance*.55)));
    card.style.setProperty('--deck-ry',String(side*(-2.2-distance*.5)));
    card.style.setProperty('--deck-scale',String(Math.max(.88,1-distance*.025)));
    card.style.setProperty('--deck-opacity',String(Math.max(.48,1-distance*.13)));
    card.style.setProperty('--deck-brightness',String(Math.max(.6,1-distance*.08)));
    card.style.zIndex=String(active?50:40-distance);
  });
  const count=deck?.querySelector('.deck-count');
  if(count) count.textContent=`${String(selectedIndex+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
}

cards.forEach((card,i)=>{
  card.dataset.deckIndex=String(i+1).padStart(2,'0');
  card.addEventListener('click',(e)=>{
    if(e.target.closest('a')) return;
    if(innerWidth>820 && i!==selectedIndex) renderDeck(i);
  });
  card.addEventListener('keydown',(e)=>{
    if(innerWidth<=820) return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();renderDeck(i);}
    if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();renderDeck(selectedIndex+1);}
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();renderDeck(selectedIndex-1);}
  });
});

if(deck && cards.length){
  const controls=document.createElement('div');
  controls.className='deck-controls';
  controls.setAttribute('aria-label','Project deck controls');
  controls.innerHTML='<button class="deck-control deck-prev" type="button" aria-label="Previous project">↑</button><span class="deck-count" aria-live="polite"></span><button class="deck-control deck-next" type="button" aria-label="Next project">↓</button>';
  deck.appendChild(controls);
  controls.querySelector('.deck-prev').addEventListener('click',()=>renderDeck(selectedIndex-1));
  controls.querySelector('.deck-next').addEventListener('click',()=>renderDeck(selectedIndex+1));
  renderDeck(0,false);
}

// Experience layered visual: slight perspective only, never enough to collide.
if(!reduced && finePointer){
  const exp=document.querySelector('.experience-panel');
  if(exp){
    exp.addEventListener('pointermove',(e)=>{
      const r=exp.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      exp.querySelectorAll('.visual-layer').forEach((layer,i)=>{
        const mul=(i+1)*2.2;
        layer.style.marginLeft=`${x*mul}px`;
        layer.style.marginTop=`${y*mul}px`;
      });
    });
    exp.addEventListener('pointerleave',()=>exp.querySelectorAll('.visual-layer').forEach(l=>{l.style.marginLeft='';l.style.marginTop='';}));
  }
}


// Chrome motion language: restrained depth, sheen and floating micro-orbs across existing surfaces.
if(!reduced){
  const motionItems=[...document.querySelectorAll('.process-step,.stack-row,.edu-card,.explore-card,.experience-panel')];
  motionItems.forEach((el,i)=>el.style.setProperty('--motion-delay',`${(i%6)*55}ms`));
  if(finePointer){
    [...document.querySelectorAll('.stack-row,.edu-card,.explore-card')].forEach((el)=>{
      el.addEventListener('pointermove',(e)=>{
        const r=el.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        el.style.setProperty('--rx',`${(-y*3.2).toFixed(2)}deg`);
        el.style.setProperty('--ry',`${(x*4).toFixed(2)}deg`);
        el.style.setProperty('--lx',`${((x+.5)*100).toFixed(1)}%`);
        el.style.setProperty('--ly',`${((y+.5)*100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave',()=>{el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');});
    });
  }
}

// CHROME SATURN HERO — smooth metallic sphere + substantial silver rings.
const canvas=document.getElementById('coreCanvas');
if(canvas && !reduced){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.62;

  const scene=new THREE.Scene();
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
  pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100); camera.position.set(0,.05,9.3);
  const root=new THREE.Group(); scene.add(root);

  scene.add(new THREE.HemisphereLight(0xffffff,0x24272b,2.25));
  scene.add(new THREE.AmbientLight(0xffffff,2.1));
  const key=new THREE.DirectionalLight(0xffffff,10.5); key.position.set(-4,6,6); scene.add(key);
  const fill=new THREE.DirectionalLight(0xdde5ee,6.4); fill.position.set(5,2,4); scene.add(fill);
  const rim=new THREE.PointLight(0xffffff,85,22); rim.position.set(4,-2,5); scene.add(rim);
  const left=new THREE.PointLight(0xaeb8c2,48,20); left.position.set(-5,-1,3); scene.add(left);
  const movingLight=new THREE.PointLight(0xffffff,72,18); scene.add(movingLight);

  // Bright silver chrome: environment reflections + slightly softened metal prevent the sphere reading black.
  const sphereMat=new THREE.MeshPhysicalMaterial({
    color:0xffffff, metalness:.72, roughness:.18, clearcoat:1, clearcoatRoughness:.045,
    envMapIntensity:4.4, reflectivity:1, emissive:0x202327, emissiveIntensity:.48
  });
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.72,112,112),sphereMat); root.add(sphere);

  // Narrow dark belt preserves the Y2K Saturn contrast while the planet itself stays silver.
  const beltMat=new THREE.MeshPhysicalMaterial({color:0x5b6066,metalness:.88,roughness:.12,clearcoat:1,envMapIntensity:2.4});
  const belt=new THREE.Mesh(new THREE.TorusGeometry(1.73,.22,24,160),beltMat); belt.rotation.x=Math.PI/2; belt.scale.y=.72; root.add(belt);

  const ringMat=new THREE.MeshPhysicalMaterial({color:0xf4f6f8,metalness:.9,roughness:.075,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:3.2,side:THREE.DoubleSide});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.7,.26,36,220),ringMat); ring.rotation.x=1.17; ring.rotation.z=-.14; root.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.22,.055,20,200),ringMat.clone()); ring2.rotation.x=1.12; ring2.rotation.z=-.14; root.add(ring2);
  const haloMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false});
  const halo=new THREE.Mesh(new THREE.TorusGeometry(3.05,.018,8,260),haloMat); halo.rotation.x=.96; halo.rotation.y=.16; root.add(halo);

  // thin orbit wire and 3 small chrome moons
  const orbitMat=new THREE.MeshBasicMaterial({color:0xbec3c8,transparent:true,opacity:.34});
  const orbit=new THREE.Mesh(new THREE.TorusGeometry(3.35,.012,8,220),orbitMat); orbit.rotation.x=.75; orbit.rotation.y=.25; root.add(orbit);
  const moons=[];
  for(let i=0;i<3;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.12,32,32),sphereMat.clone()); root.add(m); moons.push(m);
  }

  let tx=0,ty=0;
  addEventListener('pointermove',(e)=>{tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2;},{passive:true});
  function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()}
  resize(); addEventListener('resize',resize);
  const clock=new THREE.Clock();
  function frame(){
    const t=clock.getElapsedTime();
    root.rotation.y += ((tx*.11)-root.rotation.y)*.022;
    root.rotation.x += ((-ty*.075)-root.rotation.x)*.022;
    root.position.y=Math.sin(t*.55)*.055;
    root.rotation.z=Math.sin(t*.28)*.012;
    sphere.rotation.y=t*.075; sphere.rotation.x=Math.sin(t*.2)*.035;
    belt.rotation.z=t*.05;
    ring.rotation.z=-.14+Math.sin(t*.28)*.055; ring.rotation.y=Math.sin(t*.16)*.035;
    ring2.rotation.z=-.14-Math.sin(t*.23)*.04; ring2.rotation.y=-Math.sin(t*.14)*.03;
    halo.rotation.z=t*.055; halo.material.opacity=.12+Math.sin(t*.9)*.045;
    movingLight.position.set(Math.cos(t*.72)*5.2,2.2+Math.sin(t*.48)*2.4,4.5+Math.sin(t*.72)*1.4);
    moons.forEach((m,i)=>{const a=t*(.24+i*.04)+i*2.05;m.position.set(Math.cos(a)*3.25,Math.sin(a*.8)*.55,Math.sin(a)*1.35);m.scale.setScalar(1+Math.sin(t*1.2+i)*.08)});
    renderer.render(scene,camera); requestAnimationFrame(frame);
  }
  frame();
}
