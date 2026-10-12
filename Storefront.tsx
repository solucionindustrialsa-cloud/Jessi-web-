"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Heart, Search, X, Plus, Minus, Trash2, MessageCircle,
  Camera, MapPin, Truck, ShieldCheck, Sparkles, Lock, ChevronRight,
  Star, Gift, Check, Menu, CreditCard, Banknote, QrCode, AtSign,
} from "lucide-react";
import { TiltCard, Scroll3D, ParallaxFloat } from "./tilt";
import { formatPrice, waLink, buildOrderMessage, CATEGORIES, type CartItem } from "@/lib/helpers";
import AdminPanel from "./AdminPanel";

type Store = {
  id: number; storeName: string; tagline: string; logoImage: string;
  whatsappNumber: string; instagram: string; address: string;
  announcement: string; heroTitle: string; heroSubtitle: string;
};
type Product = {
  id: number; name: string; description: string; price: number;
  category: string; image: string; stock: number; featured: boolean; isActive: boolean;
};
type Pay = { id: number; name: string; details: string; instructions: string; enabled: boolean };

function Logo({ store, size = 44 }: { store: Store | null; size?: number }) {
  if (store?.logoImage) {
    return <img src={store.logoImage} alt="logo" className="rounded-2xl object-cover shadow-lg shadow-pink-200" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="grid place-items-center rounded-2xl bg-gradient-to-br from-pink-400 via-rose-400 to-pink-600 shadow-lg shadow-pink-300 animate-glow"
      style={{ width: size, height: size }}
    >
      <Heart className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} fill="currentColor" />
    </div>
  );
}

function ProductImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 ${className}`}>
        <Heart className="h-12 w-12 text-pink-300" fill="currentColor" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setErr(true)} className={`object-cover ${className}`} loading="lazy" />;
}

export default function Storefront() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("todos");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "", payment: "" });

  // admin slot
  const [passOpen, setPassOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const heroRot = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    try {
      const c = localStorage.getItem("caprichitos_cart");
      if (c) setCart(JSON.parse(c));
      if (sessionStorage.getItem("caprichitos_admin") === "1") setAdminOpen(false);
    } catch { /* ignore */ }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem("caprichitos_cart", JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function load() {
    try {
      const [s, p, m] = await Promise.all([
        fetch("/api/store").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/payment-methods").then((r) => r.json()),
      ]);
      if (Array.isArray(p) && p.length === 0) {
        await fetch("/api/seed", { method: "POST" });
        const [s2, p2, m2] = await Promise.all([
          fetch("/api/store").then((r) => r.json()),
          fetch("/api/products").then((r) => r.json()),
          fetch("/api/payment-methods").then((r) => r.json()),
        ]);
        setStore(s2); setProducts(Array.isArray(p2) ? p2 : []); setPays(Array.isArray(m2) ? m2 : []);
        if (Array.isArray(m2) && m2.length > 0) setForm((f) => ({ ...f, payment: f.payment || m2[0].name }));
      } else {
        setStore(s); setProducts(Array.isArray(p) ? p : []); setPays(Array.isArray(m) ? m : []);
        if (Array.isArray(m) && m.length > 0) setForm((f) => ({ ...f, payment: f.payment || m[0].name }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const active = useMemo(() => products.filter((p) => p.isActive), [products]);
  const featured = useMemo(() => active.filter((p) => p.featured), [active]);
  const filtered = useMemo(() => {
    return active.filter((p) => {
      const okCat = cat === "todos" || p.category === cat;
      const okQ = !query || (p.name + " " + p.description).toLowerCase().includes(query.toLowerCase());
      return okCat && okQ;
    });
  }, [active, cat, query]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(p: Product) {
    setCart((prev) => {
      const f = prev.find((i) => i.productId === p.id);
      if (f) return prev.map((i) => i.productId === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, qty: 1, image: p.image }];
    });
    setToast(`💗 ${p.name} agregado`);
  }
  function setQty(id: number, qty: number) {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.productId !== id));
    else setCart((prev) => prev.map((i) => i.productId === id ? { ...i, qty } : i));
  }

  async function confirmOrder() {
    if (!form.name.trim()) { setToast("Contanos tu nombre 💗"); return; }
    if (cart.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name, customerPhone: form.phone,
          customerAddress: form.address, customerNotes: form.notes,
          items: cart, paymentMethod: form.payment || "WhatsApp",
        }),
      });
      if (!res.ok) throw new Error("order");
      const msg = buildOrderMessage(store?.storeName || "caprichitos", cart, total, {
        name: form.name, address: form.address, notes: form.notes, payment: form.payment || "WhatsApp",
      });
      window.open(waLink(store?.whatsappNumber || "", msg), "_blank");
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setToast("¡Pedido enviado por WhatsApp! 💗");
      setForm({ name: "", phone: "", address: "", notes: "", payment: pays[0]?.name || "WhatsApp" });
    } catch {
      setToast("Ups, intentá de nuevo");
    } finally {
      setSending(false);
    }
  }

  function tryPass() {
    if (pass === "Jessi123") {
      sessionStorage.setItem("caprichitos_admin", "1");
      setPassOpen(false); setPass(""); setPassErr("");
      setAdminOpen(true);
    } else {
      setPassErr("Contraseña incorrecta 💔");
    }
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of active) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [active]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-br from-white via-pink-50 to-pink-100">
        <div className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-2xl shadow-pink-300 animate-floaty">
            <Heart className="h-10 w-10 text-white" fill="currentColor" />
          </div>
          <p className="font-display mt-5 text-2xl font-bold text-pink-600">caprichitos_cosas_lindas</p>
          <p className="mt-1 text-sm text-pink-400">cargando cosas lindas… 💗</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fff8fa]">
      {/* announcement */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 py-2 text-center text-[13px] font-semibold tracking-wide text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">{store?.announcement}</span>
          <Sparkles className="h-4 w-4 shrink-0" />
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a href="#inicio" className="flex items-center gap-3">
            <Logo store={store} />
            <div className="leading-tight">
              <p className="font-display text-[15px] font-extrabold text-pink-700 sm:text-lg break-all">{store?.storeName}</p>
              <p className="hidden text-xs text-pink-400 sm:block">{store?.tagline}</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-pink-700 md:flex">
            <a href="#inicio" className="hover:text-pink-500">Inicio</a>
            <a href="#categorias" className="hover:text-pink-500">Categorías</a>
            <a href="#productos" className="hover:text-pink-500">Productos</a>
            <a href="#como-comprar" className="hover:text-pink-500">Cómo comprar</a>
            <a href="#contacto" className="hover:text-pink-500">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={`https://instagram.com/${store?.instagram || ""}`}
              target="_blank"
              className="hidden h-10 w-10 place-items-center rounded-full border border-pink-200 text-pink-500 transition hover:bg-pink-50 sm:grid"
            >
              <Camera className="h-5 w-5" />
            </a>
            <button
              onClick={() => setCartOpen(true)}
              className="relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-300 transition hover:scale-105"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-extrabold text-pink-600 shadow animate-pop">{count}</span>
              )}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-full border border-pink-200 text-pink-600 md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-pink-700 md:hidden">
            {[["#inicio", "Inicio"], ["#categorias", "Categorías"], ["#productos", "Productos"], ["#como-comprar", "Cómo comprar"], ["#contacto", "Contacto"]].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-pink-50">{l}</a>
            ))}
          </nav>
        )}
      </header>

      {/* HERO 3D */}
      <section id="inicio" ref={heroRef} className="pink-grid relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-rose-200/60 blur-3xl" />
        <ParallaxFloat className="pointer-events-none absolute left-[6%] top-24 hidden lg:block" speed={50}>
          <div className="grid h-16 w-16 rotate-12 place-items-center rounded-2xl bg-white shadow-xl shadow-pink-200 animate-floaty">
            <Gift className="h-8 w-8 text-pink-500" />
          </div>
        </ParallaxFloat>
        <ParallaxFloat className="pointer-events-none absolute bottom-24 right-[8%] hidden lg:block" speed={-40}>
          <div className="grid h-14 w-14 -rotate-12 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-xl shadow-pink-300 animate-floaty2">
            <Heart className="h-7 w-7 text-white" fill="currentColor" />
          </div>
        </ParallaxFloat>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-2 lg:pt-16">
          <motion.div style={{ opacity: heroOpacity }} className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 30 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.25 }}
              style={{ transformPerspective: 1000 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-1.5 text-xs font-bold text-pink-600 shadow-sm">
                <Star className="h-3.5 w-3.5" fill="currentColor" /> Emprendimiento · hecho con amor
              </span>
              <h1 className="font-display mt-4 text-4xl font-extrabold leading-[1.05] text-pink-950 sm:text-6xl">
                {store?.heroTitle}{" "}
                <span className="shimmer-text">cosas lindas</span> 💗
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pink-900/70 sm:text-lg">{store?.heroSubtitle}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#productos" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-pink-300 transition hover:scale-105">
                  <ShoppingBag className="h-4 w-4" /> Ver productos
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <a
                  href={waLink(store?.whatsappNumber || "", `Hola ${store?.storeName}! 💗 Quiero hacer una consulta`)}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-pink-200 bg-white px-7 py-3.5 text-sm font-bold text-pink-600 shadow-sm transition hover:border-pink-400 hover:scale-105"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
              <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
                {[
                  [`+${Math.max(120, active.length * 37)}`, "clientas felices"],
                  [`${active.length || 8}`, "productos"],
                  ["100%", "con amor"],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-2xl border border-pink-100 bg-white/80 p-3 text-center shadow-sm backdrop-blur">
                    <p className="font-display text-xl font-extrabold text-pink-600 sm:text-2xl">{n}</p>
                    <p className="text-[11px] font-semibold text-pink-400">{l}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* 3D hero visual */}
          <motion.div style={{ y: heroY, scale: heroScale, rotateX: heroRot }} className="relative mx-auto w-full max-w-[480px] perspective-1500">
            <motion.div
              initial={{ opacity: 0, rotateY: -28, rotateX: 14, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: 0, rotateX: 0, scale: 1 }}
              transition={{ duration: 1.1, type: "spring", bounce: 0.2 }}
              className="preserve-3d relative"
            >
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-pink-300 via-rose-200 to-pink-400 opacity-50 blur-2xl" />
              <TiltCard max={16} className="relative">
                <div className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl shadow-pink-300">
                  <ProductImage src="/images/hero-flatlay.jpg" alt="hero" className="aspect-square w-full" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-pink-900/60 to-transparent p-5 pt-14">
                    <p className="font-display text-lg font-bold text-white">Nueva colección 💗</p>
                    <p className="text-xs text-pink-100">Bolsos · Mochilas · Vasos térmicos</p>
                  </div>
                </div>
              </TiltCard>
              {/* floating mini cards */}
              <motion.div
                className="preserve-3d absolute -left-6 top-8 sm:-left-12"
                animate={{ y: [0, -14, 0], rotate: [0, 4, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{ transform: "translateZ(80px)" }}
              >
                <div className="flex items-center gap-2 rounded-2xl border border-pink-100 bg-white/95 p-2 pr-4 shadow-xl shadow-pink-200 backdrop-blur">
                  <ProductImage src="/images/vaso-rosa.jpg" alt="vaso" className="h-12 w-12 rounded-xl" />
                  <div>
                    <p className="text-xs font-extrabold text-pink-800">Vaso térmico</p>
                    <p className="text-xs font-bold text-pink-500">{formatPrice(15999)}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="absolute -right-4 bottom-16 sm:-right-8"
                animate={{ y: [0, 12, 0], rotate: [0, -4, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2 rounded-2xl border border-pink-100 bg-white/95 p-2 pr-4 shadow-xl shadow-pink-200 backdrop-blur">
                  <ProductImage src="/images/mochila-rosa.jpg" alt="mochi" className="h-12 w-12 rounded-xl" />
                  <div>
                    <p className="text-xs font-extrabold text-pink-800">Mochila mini</p>
                    <p className="flex items-center gap-1 text-xs font-bold text-pink-500"><Star className="h-3 w-3" fill="currentColor" /> 4.9</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <div className="animate-spin-slow pointer-events-none absolute -right-8 -top-8 hidden h-28 w-28 place-items-center rounded-full border-2 border-dashed border-pink-300 text-pink-400 sm:grid">
              <Heart className="h-8 w-8" fill="currentColor" />
            </div>
          </motion.div>
        </div>

        {/* marquee */}
        <div className="relative border-y border-pink-100 bg-white/70 py-3 backdrop-blur">
          <div className="flex overflow-hidden">
            <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8 text-sm font-extrabold uppercase tracking-widest text-pink-400">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                  Bolsos <Heart className="h-4 w-4" fill="currentColor" /> Mochilas <Heart className="h-4 w-4" fill="currentColor" /> Vasos térmicos <Heart className="h-4 w-4" fill="currentColor" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section id="categorias" className="mx-auto max-w-6xl px-4 py-16">
        <Scroll3D className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-pink-400">Explorá por categoría</p>
          <h2 className="font-display mt-2 text-3xl font-extrabold text-pink-950 sm:text-4xl">¿Qué caprichito buscás hoy? 💅</h2>
        </Scroll3D>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { id: "bolsos", label: "Bolsos", img: "/images/bolso-rosa.jpg", desc: "Canchero & chic" },
            { id: "mochilas", label: "Mochilas", img: "/images/mochila-rosa.jpg", desc: "Cómodas & cute" },
            { id: "vasos", label: "Vasos térmicos", img: "/images/vaso-rosa.jpg", desc: "Frío & calor" },
            { id: "combos", label: "Combos", img: "/images/hero-flatlay.jpg", desc: "Para regalar" },
          ].map((c, i) => (
            <Scroll3D key={c.id} delay={i * 0.1}>
              <TiltCard max={12}>
                <button
                  onClick={() => { setCat(c.id); document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="group relative block w-full overflow-hidden rounded-3xl border border-pink-100 bg-white text-left shadow-lg shadow-pink-100 transition hover:shadow-xl hover:shadow-pink-200"
                >
                  <ProductImage src={c.img} alt={c.label} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-pink-900/70 via-pink-900/10 to-transparent" />
                  <div className="absolute bottom-0 w-full p-4">
                    <p className="font-display text-lg font-extrabold text-white">{c.label}</p>
                    <p className="text-xs font-semibold text-pink-100">{c.desc} · {counts[c.id] ?? 0} productos</p>
                  </div>
                </button>
              </TiltCard>
            </Scroll3D>
          ))}
        </div>
      </section>

      {/* DESTACADOS */}
      {featured.length > 0 && (
        <section className="bg-gradient-to-b from-pink-50 via-white to-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <Scroll3D className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-pink-400">Los más amados</p>
                <h2 className="font-display mt-1 text-3xl font-extrabold text-pink-950 sm:text-4xl">Destacados 💗</h2>
              </div>
              <a href="#productos" className="hidden items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-700 sm:inline-flex">Ver todo <ChevronRight className="h-4 w-4" /></a>
            </Scroll3D>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.slice(0, 4).map((p, i) => (
                <Scroll3D key={p.id} delay={i * 0.08}>
                  <ProductCard p={p} onAdd={() => addToCart(p)} badge="⭐ Destacado" />
                </Scroll3D>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUCTOS */}
      <section id="productos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <Scroll3D className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-pink-400">Catálogo completo</p>
          <h2 className="font-display mt-2 text-3xl font-extrabold text-pink-950 sm:text-4xl">Nuestros productos 🛍️</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-pink-900/60">Elegí tus favoritos y pedilos por WhatsApp en un click</p>
        </Scroll3D>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar bolso, mochila, vaso…"
              className="w-full rounded-full border border-pink-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-pink-900 shadow-sm outline-none placeholder:text-pink-300 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
            />
          </div>
          <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${cat === c.id ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-300" : "border border-pink-200 bg-white text-pink-600 hover:border-pink-400"}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-pink-200 bg-white p-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-pink-200" fill="currentColor" />
            <p className="font-display mt-3 text-lg font-bold text-pink-700">No encontramos ese caprichito</p>
            <p className="text-sm text-pink-400">Probá con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p, i) => (
              <Scroll3D key={p.id} delay={(i % 4) * 0.07}>
                <ProductCard p={p} onAdd={() => addToCart(p)} />
              </Scroll3D>
            ))}
          </div>
        )}
      </section>

      {/* COMO COMPRAR */}
      <section id="como-comprar" className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 py-16 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 2px, transparent 0)", backgroundSize: "30px 30px" }} />
        <div className="relative mx-auto max-w-6xl px-4">
          <Scroll3D className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-pink-100">Súper fácil</p>
            <h2 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">Cómo comprar 📲</h2>
          </Scroll3D>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", t: "Elegí tus favoritos", d: "Agregá bolsos, mochilas y vasos al carrito.", icon: ShoppingBag },
              { n: "02", t: "Confirmá por WhatsApp", d: "Completá tus datos y se abre el chat con tu pedido listo.", icon: MessageCircle },
              { n: "03", t: "Coordinamos entrega", d: "Elegí tu medio de pago y coordinamos envío o retiro.", icon: Truck },
            ].map((s, i) => (
              <Scroll3D key={s.n} delay={i * 0.12}>
                <TiltCard max={10}>
                  <div className="preserve-3d relative overflow-hidden rounded-3xl border border-white/25 bg-white/15 p-6 backdrop-blur-xl">
                    <span className="font-display absolute -right-2 -top-4 text-7xl font-extrabold text-white/15">{s.n}</span>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-pink-600 shadow-lg">
                      <s.icon className="h-6 w-6" />
                    </div>
                    <p className="font-display mt-4 text-xl font-bold">{s.t}</p>
                    <p className="mt-1 text-sm text-pink-100">{s.d}</p>
                  </div>
                </TiltCard>
              </Scroll3D>
            ))}
          </div>

          {/* pagos */}
          <Scroll3D className="mt-10">
            <div className="rounded-3xl border border-white/25 bg-white/12 p-6 backdrop-blur-xl">
              <p className="font-display flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5" /> Medios de pago aceptados</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(pays.filter((p) => p.enabled).length ? pays.filter((p) => p.enabled) : pays).map((p) => (
                  <div key={p.id} className="rounded-2xl bg-white p-4 text-pink-900 shadow">
                    <p className="flex items-center gap-2 text-sm font-extrabold"><Banknote className="h-4 w-4 text-pink-500" />{p.name}</p>
                    <p className="mt-1 text-xs text-pink-900/60">{p.details}</p>
                    {p.instructions && <p className="mt-1 text-[11px] font-semibold text-pink-500">{p.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>
          </Scroll3D>
        </div>
      </section>

      {/* INFO */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Truck, t: "Envíos a todo el país", d: store?.address || "Coordinamos por WhatsApp" },
            { icon: ShieldCheck, t: "Compra segura", d: "Atención personalizada por WhatsApp" },
            { icon: QrCode, t: "Instagram", d: `@${store?.instagram}` },
          ].map((c, i) => (
            <Scroll3D key={c.t} delay={i * 0.1}>
              <div className="flex items-start gap-4 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink-100 text-pink-600"><c.icon className="h-6 w-6" /></div>
                <div><p className="font-display font-bold text-pink-900">{c.t}</p><p className="text-sm text-pink-900/60">{c.d}</p></div>
              </div>
            </Scroll3D>
          ))}
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
        <Scroll3D>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-pink-100 via-white to-rose-100 p-8 text-center shadow-xl shadow-pink-100 sm:p-12">
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-pink-200/50 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-rose-200/50 blur-2xl" />
            <Logo store={store} size={64} />
            <h2 className="font-display mx-auto mt-4 max-w-lg text-3xl font-extrabold text-pink-950">¿Lista para tu próximo caprichito? 💗</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-pink-900/60">Escribinos por WhatsApp o Instagram y te asesoramos con amor</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={waLink(store?.whatsappNumber || "", `Hola ${store?.storeName}! 💗 Quiero hacer un pedido`)} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-green-200 transition hover:scale-105">
                <MessageCircle className="h-4 w-4" /> Pedir por WhatsApp
              </a>
              <a href={`https://instagram.com/${store?.instagram}`} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-pink-200 transition hover:scale-105">
                <Camera className="h-4 w-4" /> @{store?.instagram}
              </a>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-pink-400"><MapPin className="h-3.5 w-3.5" />{store?.address}</p>
          </div>
        </Scroll3D>
      </section>

      <footer className="border-t border-pink-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <Logo store={store} size={32} />
            <p className="text-sm font-bold text-pink-700">{store?.storeName}</p>
          </div>
          <p className="text-xs text-pink-400">© {new Date().getFullYear()} · Hecho con 💗 en Argentina · Pedidos por WhatsApp</p>
        </div>
      </footer>

      {/* whatsapp flotante */}
      <a
        href={waLink(store?.whatsappNumber || "", `Hola ${store?.storeName}! 💗 Consulta`)}
        target="_blank"
        className="fixed bottom-5 left-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-green-300 transition hover:scale-110"
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      {/* ═══ RANURA SECRETA ADMIN ═══ */}
      <button
        onClick={() => setPassOpen(true)}
        title="admin"
        aria-label="admin"
        className="group fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center"
      >
        <span className="flex items-center gap-1 rounded-l-2xl border-y-2 border-l-2 border-pink-300/70 bg-gradient-to-b from-pink-100 to-pink-200/90 py-4 pl-1.5 pr-1 shadow-lg shadow-pink-200 backdrop-blur transition-all duration-300 hover:pl-3 hover:from-pink-500 hover:to-rose-500 hover:text-white text-pink-400">
          <span className="admin-slot text-[10px] font-extrabold uppercase tracking-[0.3em] opacity-0 transition group-hover:opacity-100">admin</span>
          <Lock className="h-3.5 w-3.5" />
          <span className="mx-0.5 h-10 w-[3px] rounded-full bg-current opacity-40" />
        </span>
      </button>

      {/* CART */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} className="fixed inset-0 z-50 bg-pink-950/40 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-pink-100 p-5">
                <p className="font-display text-xl font-extrabold text-pink-900">Tu carrito 🛍️ ({count})</p>
                <button onClick={() => setCartOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-pink-50 text-pink-500"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {cart.length === 0 ? (
                  <div className="grid place-items-center py-16 text-center">
                    <ShoppingBag className="h-12 w-12 text-pink-200" />
                    <p className="font-display mt-3 font-bold text-pink-700">Tu carrito está vacío</p>
                    <p className="text-sm text-pink-400">¡Llenalo de cosas lindas! 💗</p>
                    <button onClick={() => { setCartOpen(false); document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-bold text-white">Ver productos</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((i) => (
                      <div key={i.productId} className="flex gap-3 rounded-2xl border border-pink-100 p-3">
                        <ProductImage src={i.image || ""} alt={i.name} className="h-16 w-16 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-pink-900">{i.name}</p>
                          <p className="text-sm font-extrabold text-pink-600">{formatPrice(i.price)}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <button onClick={() => setQty(i.productId, i.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full bg-pink-50 text-pink-600"><Minus className="h-3.5 w-3.5" /></button>
                            <span className="text-sm font-bold">{i.qty}</span>
                            <button onClick={() => setQty(i.productId, i.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full bg-pink-50 text-pink-600"><Plus className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setQty(i.productId, 0)} className="ml-auto text-pink-300 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="border-t border-pink-100 p-5">
                  <div className="flex justify-between text-sm font-bold text-pink-900"><span>Total</span><span className="font-display text-xl text-pink-600">{formatPrice(total)}</span></div>
                  <button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 py-3.5 text-sm font-bold text-white shadow-xl shadow-pink-200 transition hover:scale-[1.02]">
                    <MessageCircle className="h-4 w-4" /> Confirmar por WhatsApp
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CHECKOUT */}
      <AnimatePresence>
        {checkoutOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-pink-950/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.92, rotateX: 12 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} exit={{ opacity: 0, scale: 0.92 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8" style={{ transformPerspective: 1000 }}>
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-extrabold text-pink-900">Finalizar pedido 💗</p>
                <button onClick={() => setCheckoutOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-pink-50 text-pink-500"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-2 rounded-2xl bg-pink-50 p-4 text-sm">
                {cart.map((i) => (
                  <div key={i.productId} className="flex justify-between font-semibold text-pink-900"><span>{i.qty}x {i.name}</span><span>{formatPrice(i.price * i.qty)}</span></div>
                ))}
                <div className="flex justify-between border-t border-pink-200 pt-2 font-extrabold text-pink-700"><span>Total</span><span>{formatPrice(total)}</span></div>
              </div>
              <div className="mt-4 space-y-3">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre *" className="w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Tu teléfono / WhatsApp" className="w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100" />
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección / localidad" className="w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100" />
                <div>
                  <p className="mb-1.5 text-xs font-bold text-pink-500">Medio de pago</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(pays.filter((p) => p.enabled).length ? pays.filter((p) => p.enabled) : [{ id: 0, name: "WhatsApp", details: "", instructions: "", enabled: true }]).map((p) => (
                      <button key={p.id} onClick={() => setForm({ ...form, payment: p.name })} className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition ${form.payment === p.name ? "border-pink-500 bg-pink-50 text-pink-700 shadow" : "border-pink-100 text-pink-900/60 hover:border-pink-300"}`}>
                        <span className="flex items-center gap-1"><Check className={`h-3.5 w-3.5 ${form.payment === p.name ? "text-pink-500" : "text-transparent"}`} />{p.name}</span>
                        {p.details && <span className="mt-0.5 block text-[10px] font-medium opacity-70">{p.details}</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas (color, talle, horario…)" rows={2} className="w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100" />
                <button onClick={confirmOrder} disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-xl shadow-green-200 transition hover:scale-[1.02] disabled:opacity-60">
                  <MessageCircle className="h-4 w-4" /> {sending ? "Enviando…" : `Enviar pedido · ${formatPrice(total)}`}
                </button>
                <p className="text-center text-[11px] text-pink-400">Se abrirá WhatsApp con tu pedido listo para enviar 💗</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PASSWORD */}
      <AnimatePresence>
        {passOpen && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-pink-950/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-300">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <p className="font-display mt-3 text-xl font-extrabold text-pink-900">Zona privada 🔐</p>
              <p className="text-sm text-pink-400">Ingresá la contraseña de administración</p>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryPass()}
                placeholder="••••••••"
                autoFocus
                className="mt-4 w-full rounded-2xl border border-pink-200 px-4 py-3 text-center text-sm font-bold tracking-widest outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              />
              {passErr && <p className="mt-2 text-xs font-bold text-red-400">{passErr}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { setPassOpen(false); setPass(""); setPassErr(""); }} className="rounded-full border border-pink-200 py-2.5 text-sm font-bold text-pink-500">Cancelar</button>
                <button onClick={tryPass} className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-200">Entrar 💗</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN */}
      <AnimatePresence>
        {adminOpen && (
          <AdminPanel
            store={store}
            onClose={() => setAdminOpen(false)}
            onRefresh={load}
            onToast={(m: string) => setToast(m)}
          />
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-pink-900 px-6 py-3 text-sm font-bold text-white shadow-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ p, onAdd, badge }: { p: Product; onAdd: () => void; badge?: string }) {
  const low = p.stock <= 5;
  return (
    <TiltCard max={9} scale={1.02}>
      <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-md shadow-pink-100 transition hover:shadow-xl hover:shadow-pink-200">
        <div className="relative overflow-hidden">
          <ProductImage src={p.image} alt={p.name} className="aspect-square w-full transition duration-500 group-hover:scale-110" />
          {badge && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-pink-600 shadow backdrop-blur">{badge}</span>}
          {p.stock === 0 && <span className="absolute inset-0 grid place-items-center bg-white/60 text-sm font-extrabold text-pink-700 backdrop-blur-[1px]">Sin stock 😢</span>}
          {low && p.stock > 0 && <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-extrabold text-white shadow">¡Quedan {p.stock}!</span>}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-pink-400">{p.category}</p>
          <p className="font-display mt-0.5 font-bold leading-snug text-pink-950">{p.name}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-pink-900/55">{p.description}</p>
          <div className="mt-auto flex items-center justify-between pt-3">
            <p className="font-display text-lg font-extrabold text-pink-600">{formatPrice(p.price)}</p>
            <button
              onClick={onAdd}
              disabled={p.stock === 0}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-200 transition hover:scale-105 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
