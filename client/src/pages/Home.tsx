import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContactForm from '@/components/ContactForm';
import { ChevronsDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ===== DATA ===== */
const SERVICES = [
  { icon: '🎨', title: 'Custom Web Design', desc: 'Bespoke designs that capture your brand essence and convert visitors into loyal customers.' },
  { icon: '⚡', title: 'Speed Optimization', desc: 'Lightning-fast load times that keep visitors engaged and boost your search rankings.' },
  { icon: '📱', title: 'Responsive Development', desc: 'Pixel-perfect experiences across every device, from mobile to ultrawide displays.' },
  { icon: '🔍', title: 'SEO Strategy', desc: 'Data-driven optimization that puts your business in front of the right audience.' },
  { icon: '📈', title: 'Sales Funnel Design', desc: 'Strategic conversion paths that turn cold traffic into paying customers.' },
  { icon: '🛡️', title: 'Maintenance & Support', desc: '24/7 monitoring, updates, and dedicated support to keep your site running flawlessly.' },
];

const PROCESS_STEPS = [
  { num: '01', title: 'Discovery', desc: 'Deep dive into your business goals, target audience, and competitive landscape.' },
  { num: '02', title: 'Strategy', desc: 'Craft a data-driven blueprint for your website architecture and conversion flow.' },
  { num: '03', title: 'Design', desc: 'Create stunning visual concepts with interactive prototypes for your approval.' },
  { num: '04', title: 'Development', desc: 'Build your site with clean code, smooth animations, and blazing performance.' },
  { num: '05', title: 'Launch & Scale', desc: 'Deploy, optimize, and continuously improve based on real user data.' },
];

const PRICING = [
  {
    name: 'Spark Starter',
    price: '$799',
    desc: 'Perfect for startups and personal brands',
    features: ['7-Page Custom Website', 'Mobile Responsive', 'Basic SEO Setup', 'Contact Form', '7-Day Delivery'],
    popular: false,
  },
  {
    name: 'Business Booster',
    price: '$1599',
    desc: 'For businesses ready to scale',
    features: ['15-Page Custom Website', 'Advanced Animations', 'Full SEO Optimization', 'Sales Funnel Integration', 'Analytics Dashboard', 'Priority Support'],
    popular: false,
  },
  {
    name: 'Growth Accelerator',
    price: '$1999',
    desc: 'Enterprise-grade solutions',
    features: ['Unlimited Pages', '3D/Interactive Elements', 'E-Commerce Integration', 'Custom CMS', 'A/B Testing Setup', 'Dedicated Account Manager', '24/7 Support'],
    popular: true,
  },
];

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'CEO, NovaTech', text: 'LuminaWeave transformed our online presence completely. Our conversion rate increased by 340% within the first month. Absolutely world-class work.', stars: 5 },
  { name: 'Marcus Johnson', role: 'Founder, FitPro', text: 'The attention to detail is unmatched. Every animation, every interaction — it all feels intentional and premium. Our members love the new experience.', stars: 5 },
  { name: 'Elena Rodriguez', role: 'CMO, Luxe Boutique', text: 'Working with LuminaWeave was a game-changer. They don\'t just build websites — they build revenue machines. Our sales doubled in 60 days.', stars: 5 },
];

const STATS = [
  { value: 150, suffix: '+', label: 'Websites Launched' },
  { value: 98, suffix: '%', label: 'Client Satisfaction' },
  { value: 7, suffix: '', label: 'Day Avg. Delivery' },
  { value: 799, suffix: '', label: 'Starting at $' },
];

/* ===== HELPER: Ripple Effect ===== */
function createRipple(e: React.MouseEvent<HTMLElement>) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

/* ===== COMPONENT: AnimatedCounter ===== */
function AnimatedCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const duration = 2000;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.floor(eased * target);
            setCount(start);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-[#C9A84C]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        {label === 'Starting at $' ? `$${count}` : `${count}${suffix}`}
      </div>
      <div className="text-sm text-gray-500 mt-2 uppercase tracking-widest">{label === 'Starting at $' ? 'Starting Price' : label}</div>
    </div>
  );
}

/* ===== COMPONENT: ServiceCard ===== */
function ServiceCard({ icon, title, desc, index }: { icon: string; title: string; desc: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="glow-card reveal-up bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-8 hover:border-[#C9A84C]/30 transition-all duration-500 group"
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="text-4xl mb-5 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[#C9A84C] transition-colors">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ===== COMPONENT: PricingCard ===== */
function PricingCard({ plan, index, onSelect }: { plan: typeof PRICING[0]; index: number; onSelect: (name: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`pricing-card glow-card reveal-up relative rounded-2xl p-10 pt-16 pb-14 min-h-[580px] border transition-all duration-500 ${
        plan.popular
          ? 'popular-card bg-gradient-to-b from-[#C9A84C]/12 via-[#0a0a0a] to-[#050505] border-[#C9A84C]/50 md:scale-[1.02] shadow-[0_0_40px_rgba(201,168,76,0.18)]'
          : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#C9A84C]/30'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {plan.popular && (
        <div className="popular-badge">
          <span>Most Popular</span>
        </div>
      )}
      <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
      <p className="text-gray-500 text-sm mb-6">{plan.desc}</p>
      <div className="mb-6">
        <span className="text-5xl md:text-6xl font-bold text-[#C9A84C]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{plan.price}</span>
        <span className="text-gray-500 text-sm ml-2 align-baseline">/ project</span>
      </div>
      <ul className="space-y-3 mb-8">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
            <span className="text-[#C9A84C]">✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={(e) => { createRipple(e); onSelect(plan.name); }}
        className={`btn-ripple w-full py-3 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all duration-300 ${
          plan.popular
            ? 'bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C]'
            : 'border border-[#C9A84C]/50 text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#050505]'
        }`}
      >
        Get Started
      </button>
    </div>
  );
}

/* ===== COMPONENT: TestimonialCard ===== */
function TestimonialCard({ testimonial, index }: { testimonial: typeof TESTIMONIALS[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -5;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 5;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) card.style.transform = 'perspective(600px) rotateX(0) rotateY(0)';
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="reveal-up bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-8 hover:border-[#C9A84C]/30 transition-all duration-300"
      style={{ transitionDelay: `${index * 150}ms`, transformStyle: 'preserve-3d' }}
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: testimonial.stars }).map((_, i) => (
          <span key={i} className="text-[#C9A84C] text-lg">★</span>
        ))}
      </div>
      <p className="text-gray-400 italic leading-relaxed mb-6">"{testimonial.text}"</p>
      <div>
        <p className="text-white font-semibold">{testimonial.name}</p>
        <p className="text-[#C9A84C] text-sm">{testimonial.role}</p>
      </div>
    </div>
  );
}

/* ===== MAIN HOME COMPONENT ===== */
export default function Home() {
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [preloaderProgress, setPreloaderProgress] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [, setLocation] = useLocation();

  const handlePlanSelect = useCallback((name: string) => {
    setSelectedPlan(name);
    setLocation('/checkout');
  }, [setLocation]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  }, []);

  /* ===== PRELOADER ===== */
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        setPreloaderProgress(100);
        clearInterval(interval);
        setTimeout(() => setPreloaderDone(true), 600);
      } else {
        setPreloaderProgress(Math.floor(progress));
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  /* ===== THREE.JS PARTICLE UNIVERSE ===== */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2500;
    const starPositions = new Float32Array(starsCount * 3);
    const starSizes = new Float32Array(starsCount);
    for (let i = 0; i < starsCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 20;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      starSizes[i] = Math.random() * 2 + 0.5;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    const starsMat = new THREE.PointsMaterial({ color: 0xC9A84C, size: 0.03, transparent: true, opacity: 0.8, sizeAttenuation: true });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // Torus rings
    const torusGroup = new THREE.Group();
    const torusMat = new THREE.MeshBasicMaterial({ color: 0x8B7A2E, wireframe: true, transparent: true, opacity: 0.25 });
    for (let i = 0; i < 3; i++) {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 0.5, 0.02, 16, 100), torusMat);
      torus.rotation.x = Math.random() * Math.PI;
      torus.rotation.y = Math.random() * Math.PI;
      torusGroup.add(torus);
    }
    scene.add(torusGroup);

    let mouseX = 0, mouseY = 0;
    const handleMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouse);

    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      stars.rotation.y = t * 0.02;
      stars.rotation.x = t * 0.01;

      torusGroup.children.forEach((torus, i) => {
        torus.rotation.x += 0.002 * (i + 1);
        torus.rotation.y += 0.003 * (i + 1);
      });

      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      torusMat.dispose();
    };
  }, []);

  /* ===== SCROLL ANIMATIONS ===== */
  useEffect(() => {
    if (!preloaderDone) return;

    // Reveal elements on scroll
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    revealElements.forEach((el) => observer.observe(el));

    // Scroll progress bar
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      const bar = document.getElementById('scroll-progress');
      if (bar) bar.style.width = `${progress}%`;

      // Active nav
      const sections = ['home', 'about', 'services', 'pricing', 'contact'];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 200) {
          setActiveNav(id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);

    // GSAP hero animation
    const tl = gsap.timeline();
    tl.from('.hero-badge', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from('.hero-title-line', { y: 80, opacity: 0, duration: 1, stagger: 0.2, ease: 'power3.out' }, '-=0.4')
      .from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from('.hero-cta', { y: 30, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out' }, '-=0.4')
      .from('.hero-scroll', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.3');

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [preloaderDone]);

  const NAV_LINKS = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <>
      {/* Custom Cursor */}
      {/* Scroll Progress */}
      <div id="scroll-progress" style={{ width: '0%' }} />

      {/* Preloader */}
      <div className={`preloader ${preloaderDone ? 'hidden' : ''}`}>
        <div className="preloader-logo">LuminaWeave</div>
        <div className="preloader-bar">
          <div className="preloader-fill" style={{ width: `${preloaderProgress}%` }} />
        </div>
        <div className="text-gray-600 text-xs mt-4 tracking-widest">{preloaderProgress}%</div>
      </div>

      {/* Navigation */}
      <nav className="nav-glass fixed top-0 left-0 right-0 z-[9999] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <button onClick={() => scrollTo('home')} className="interactive text-xl font-semibold text-[#C9A84C]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            LuminaWeave
          </button>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`interactive text-sm uppercase tracking-wider transition-colors duration-300 ${
                  activeNav === link.id ? 'text-[#C9A84C]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => { setLocation('/login'); }}
              className="btn-ripple border border-[#C9A84C]/40 text-[#C9A84C] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#C9A84C]/10 transition-colors interactive"
            >
              CLIENT LOGIN
            </button>
            <button
              onClick={() => { setLocation('/checkout'); }}
              className="btn-ripple border border-[#C9A84C]/40 text-[#C9A84C] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#C9A84C]/10 transition-colors interactive"
            >
              CHECKOUT
            </button>
            <button
              onClick={(e) => { createRipple(e); setShowContactModal(true); }}
              className="btn-ripple bg-[#C9A84C] text-[#050505] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#D4B85C] transition-colors interactive"
            >
              START PROJECT
            </button>
          </div>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden interactive flex flex-col gap-1.5 p-2">
            <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="text-2xl text-white hover:text-[#C9A84C] transition-colors uppercase tracking-widest"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => { setMobileMenuOpen(false); setLocation('/login'); }}
            className="text-xl text-[#C9A84C] hover:text-white transition-colors uppercase tracking-widest"
          >
            Client Login
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); setLocation('/checkout'); }}
            className="text-xl text-[#C9A84C] hover:text-white transition-colors uppercase tracking-widest"
          >
            Checkout
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); setShowContactModal(true); }}
            className="mt-4 bg-[#C9A84C] text-[#050505] px-8 py-3 rounded-lg font-semibold"
          >
            START PROJECT
          </button>
        </div>
      </div>

      {/* ===== HERO SECTION ===== */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <canvas ref={threeCanvasRef} className="absolute inset-0 w-full h-full" />
        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <div className="hero-badge inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-pulse" />
            <span className="text-[#C9A84C] text-xs uppercase tracking-widest">Available for New Projects</span>
          </div>
          <h1 className="mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            <div className="hero-title-line text-5xl md:text-7xl lg:text-8xl font-light text-white leading-tight">
              Websites That
            </div>
            <div className="hero-title-line text-5xl md:text-7xl lg:text-8xl font-light leading-tight">
              <span className="shimmer-gold">Convert & Captivate</span>
            </div>
          </h1>
          <p className="hero-subtitle text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Premium web design & sales strategy. 150+ websites launched. 7-day delivery.
            Starting at $799. Your growth starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={(e) => { createRipple(e); scrollTo('pricing'); }}
              className="hero-cta btn-ripple interactive bg-[#C9A84C] text-[#050505] px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-[#D4B85C] transition-all duration-300 hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]"
            >
              View Pricing Plans
            </button>
          </div>
          <div className="hero-scroll mt-16 scroll-indicator">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-[#C9A84C]/50 to-transparent scroll-pulse" />
              <div className="w-12 h-12 rounded-full border border-[#C9A84C]/30 bg-white/5 backdrop-blur flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.25)] scroll-float">
                <ChevronsDown className="w-6 h-6 text-[#C9A84C]" strokeWidth={1.6} />
              </div>
              <span className="text-[11px] uppercase tracking-[0.28em] text-gray-400">Scroll</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section id="about" className="py-24 md:py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="reveal-left">
              <span className="text-[#C9A84C] text-xs uppercase tracking-widest">About LuminaWeave</span>
              <h2 className="text-4xl md:text-5xl font-light text-white mt-4 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Where Design Meets <span className="shimmer-gold">Revenue</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                We don't just build beautiful websites — we engineer digital experiences that drive measurable business growth.
                With mastery in both web development and sales strategy, every pixel is placed with conversion in mind.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                From startups to established brands, we've helped 150+ businesses transform their online presence
                into their most powerful sales tool. Our approach combines cutting-edge design with proven sales
                psychology to create websites that don't just look stunning — they perform.
              </p>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#C9A84C]">7+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Years</div>
                </div>
                <div className="w-px bg-[#1a1a1a]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#C9A84C]">150+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Projects</div>
                </div>
                <div className="w-px bg-[#1a1a1a]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#C9A84C]">340%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Avg. ROI</div>
                </div>
              </div>
            </div>
            <div className="reveal-right">
              <div className="relative bg-gradient-to-br from-[#C9A84C]/10 to-transparent border border-[#C9A84C]/20 rounded-2xl p-10 tilt-card group"
                onMouseMove={(e) => {
                  const card = e.currentTarget;
                  const rect = card.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -6;
                  const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 6;
                  card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                  card.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  card.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'perspective(800px) rotateX(0) rotateY(0)'; }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(201,168,76,0.1), transparent 40%)' }}
                />
                <div className="relative z-10 tilt-card-inner">
                  <div className="text-6xl mb-6">🎯</div>
                  <h3 className="text-2xl font-semibold text-white mb-4">Our Mission</h3>
                  <p className="text-gray-400 leading-relaxed">
                    To bridge the gap between stunning design and real business results.
                    Every website we create is a strategic asset built to convert visitors
                    into customers and drive sustainable growth.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {['React', 'Next.js', 'Three.js', 'GSAP', 'Tailwind', 'TypeScript'].map((tech) => (
                      <span key={tech} className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-3 py-1 rounded-full border border-[#C9A84C]/20">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="py-20 bg-[#0a0a0a] border-y border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <AnimatedCounter key={i} target={stat.value} suffix={stat.suffix} label={stat.label} />
          ))}
        </div>
      </section>

      {/* ===== SERVICES SECTION ===== */}
      <section id="services" className="py-24 md:py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="reveal-up text-[#C9A84C] text-xs uppercase tracking-widest">What We Offer</span>
            <h2 className="reveal-up text-4xl md:text-5xl font-light text-white mt-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Services That <span className="shimmer-gold">Drive Growth</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, i) => (
              <ServiceCard key={i} {...service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROCESS SECTION ===== */}
      <section className="py-24 md:py-32 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="reveal-up text-[#C9A84C] text-xs uppercase tracking-widest">How We Work</span>
            <h2 className="reveal-up text-4xl md:text-5xl font-light text-white mt-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Our Proven <span className="shimmer-gold">Process</span>
            </h2>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#C9A84C]/50 via-[#C9A84C]/20 to-transparent hidden md:block" />
            <div className="space-y-12 md:space-y-16">
              {PROCESS_STEPS.map((step, i) => (
                <div key={i} className={`reveal-up flex flex-col md:flex-row items-start gap-6 md:gap-12 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className={`flex-1 ${i % 2 === 1 ? 'md:text-right' : ''}`}>
                    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-8 hover:border-[#C9A84C]/30 transition-all duration-500 group">
                      <span className="text-[#C9A84C] text-3xl font-bold opacity-30 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {step.num}
                      </span>
                      <h3 className="text-xl font-semibold text-white mt-2 mb-3 group-hover:text-[#C9A84C] transition-colors">{step.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 shrink-0 z-10">
                    <span className="text-[#C9A84C] text-sm font-bold">{step.num}</span>
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="relative py-24 md:py-32 bg-[#0a0a0a] overflow-hidden">
        {/* animated 2D shimmer accents, similar to hero mission aura */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-[#C9A84C]/8 blur-[90px] animate-pulse" />
          <div className="absolute right-[-80px] bottom-0 h-72 w-72 rounded-full bg-[#8B7A2E]/10 blur-[110px] animate-[float_10s_ease-in-out_infinite]" />
          <div className="absolute left-1/3 top-1/2 h-24 w-24 rounded-full bg-[#C9A84C]/12 blur-[50px] animate-[float_14s_ease-in-out_infinite_reverse]" />
        </div>
        {/* subtle 3D floaters */}
        <div className="pricing-3d pointer-events-none">
          {['12%', '46%', '78%'].map((left, idx) => (
            <span
              key={left}
              className="pricing-3d-orb"
              style={{ left, top: `${18 + idx * 16}%`, animationDelay: `${idx * 1.6}s` }}
            />
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <span className="reveal-up text-[#C9A84C] text-xs uppercase tracking-widest">Investment</span>
            <h2 className="reveal-up text-4xl md:text-5xl font-light text-white mt-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Choose Your <span className="shimmer-gold">Growth Plan</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {PRICING.map((plan, i) => (
              <PricingCard key={i} plan={plan} index={i} onSelect={handlePlanSelect} />
            ))}
          </div>
          {/* Payment steps */}
          <div className="mt-14 grid md:grid-cols-2 gap-8 items-start">
            <div className="reveal-left bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-xs uppercase tracking-[0.2em] mb-4">
                Smooth Payment Flow
              </div>
              <h3 className="text-2xl font-semibold text-white mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                From deposit to launch in five clear steps
              </h3>
              <ol className="space-y-4 text-gray-300">
                <li className="flex gap-3">
                  <span className="text-[#C9A84C] font-semibold">Step 1</span>
                  <span>Pay just 20% to get started.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A84C] font-semibold">Step 2</span>
                  <span>We build your website in 7 days — guaranteed ⚡.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A84C] font-semibold">Step 3</span>
                  <span>You see a full preview — click through everything.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A84C] font-semibold">Step 4</span>
                  <span>Want changes? 2 free revisions included ✅.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A84C] font-semibold">Step 5</span>
                  <span>Love it? Pay remaining 80% and we go LIVE in 24 hours 🚀.</span>
                </li>
              </ol>
              <p className="mt-6 text-sm text-gray-400">Your website is ready before your coffee gets cold. ☕</p>
            </div>

            {/* Trust Killers */}
            <div className="reveal-right bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-xs uppercase tracking-[0.2em] mb-4">
                Trust Builders
              </div>
              <h3 className="text-2xl font-semibold text-white mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Zero risk, full transparency
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-3"><span className="text-[#C9A84C]">✅</span> 7-Day Delivery Guarantee — or we give you 20% OFF</li>
                <li className="flex gap-3"><span className="text-[#C9A84C]">✅</span> Preview Before You Pay — see everything first</li>
                <li className="flex gap-3"><span className="text-[#C9A84C]">✅</span> 2 Free Revisions — we build what YOU want</li>
                <li className="flex gap-3"><span className="text-[#C9A84C]">✅</span> 100% Satisfaction Guaranteed — love it or we rebuild it</li>
                <li className="flex gap-3"><span className="text-[#C9A84C]">✅</span> No Hidden Charges. Ever.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <section className="py-24 md:py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="reveal-up text-[#C9A84C] text-xs uppercase tracking-widest">Testimonials</span>
            <h2 className="reveal-up text-4xl md:text-5xl font-light text-white mt-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              What Clients <span className="shimmer-gold">Say</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTACT SECTION ===== */}
      <section id="contact" className="py-24 md:py-32 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            <div className="reveal-left">
              <span className="text-[#C9A84C] text-xs uppercase tracking-widest">Get In Touch</span>
              <h2 className="text-4xl md:text-5xl font-light text-white mt-4 mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Let's Build Something <span className="shimmer-gold">Extraordinary</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Ready to transform your online presence? Fill out the form and we'll get back to you within 24 hours
                with a custom proposal tailored to your business goals.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">📧</div>
              <span className="text-gray-400">weavelumina@gmail.com</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">⚡</div>
                  <span className="text-gray-400">24-hour response time</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C]">🌍</div>
                  <span className="text-gray-400">Working with clients worldwide</span>
                </div>
              </div>
            </div>
            <div className="reveal-right">
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-16 bg-[#050505] border-t border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="text-2xl font-semibold text-[#C9A84C] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                LuminaWeave
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                Premium web design & sales strategy studio. We build websites that don't just look beautiful — they convert visitors into customers and drive measurable business growth.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
              <div className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <button key={link.id} onClick={() => scrollTo(link.id)} className="block text-gray-500 hover:text-[#C9A84C] transition-colors text-sm interactive">
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <div className="space-y-3">
                {SERVICES.slice(0, 4).map((s, i) => (
                  <p key={i} className="text-gray-500 text-sm">{s.title}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[#1a1a1a] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">&copy; 2024 LuminaWeave. All rights reserved.</p>
            <p className="text-gray-600 text-xs">Crafted with passion & precision</p>
          </div>
        </div>
      </footer>

      {/* ===== CONTACT MODAL ===== */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedPlan ? `Get Started with ${selectedPlan}` : 'Start Your Project'}
            </DialogTitle>
          </DialogHeader>
          <ContactForm selectedPlan={selectedPlan} onSuccess={() => setShowContactModal(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
