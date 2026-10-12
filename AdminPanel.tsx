"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X, LayoutDashboard, ShoppingBag, ClipboardList, CreditCard, Store as StoreIcon,
  Plus, Pencil, Trash2, ImagePlus, LogOut, TrendingUp, Users, Ticket,
  Check, Heart, MessageCircle, Wallet,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { formatPrice, fileToDataURL } from "@/lib/helpers";

type Store = {
  id: number; storeName: string; tagline: string; logoImage: string;
  whatsappNumber: string; instagram: string; address: string;
  announcement: string; heroTitle: string; heroSubtitle: string;
} | null;

type Product = {
  id: number; name: string; description: string; price: number;
  category: string; image: string; stock: number; featured: boolean; isActive: boolean;
};
type Pay = { id: number; name: string; details: string; instructions: string; enabled: boolean; sortOrder?: number };
type Order = {
  id: number; customerName: string; customerPhone: string; customerAddress: string;
  customerNotes: string; items: { productId: number; name: string; price: number; qty: number }[];
  total: number; paymentMethod: string; status: string; createdAt: string;
};
type Stats = {
  totalRevenue: number; totalOrders: number; uniqueClients: number; avgTicket: number;
  porDia: { fecha: string; ventas: number; pedidos: number }[];
  porCategoria: { name: string; value: number }[];
  porPago: { name: string; value: number }[];
  topProductos: { name: string; qty: number; revenue: number }[];
  clientes: { name: string; phone: string; pedidos: number; gastado: number; ultima: string }[];
  porEstado: { name: string; value: number }[];
};

const PINK = ["#f43f6e", "#fb7189", "#fda4b5", "#f9a8d4", "#e11d5c", "#fbcfe8"];
const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "productos", label: "Productos", icon: ShoppingBag },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "pagos", label: "Medios de pago", icon: CreditCard },
  { id: "tienda", label: "Tienda / Logo", icon: StoreIcon },
];

export default function AdminPanel({
  store, onClose, onRefresh, onToast,
}: {
  store: Store; onClose: () => void; onRefresh: () => void; onToast: (m: string) => void;
}) {
  const [tab, setTab] = useState("resumen");
  const [products, setProducts] = useState<Product[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [saving, setSaving] = useState(false);

  // producto form
  const [pFormOpen, setPFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pForm, setPForm] = useState({ name: "", description: "", price: "", category: "bolsos", image: "", stock: "10", featured: false, isActive: true });
  const fileRef = useRef<HTMLInputElement>(null);

  // pago form
  const [payForm, setPayForm] = useState({ id: 0, name: "", details: "", instructions: "", enabled: true });
  const [payOpen, setPayOpen] = useState(false);

  // tienda form
  const [sForm, setSForm] = useState({ storeName: "", tagline: "", logoImage: "", whatsappNumber: "", instagram: "", address: "", announcement: "", heroTitle: "", heroSubtitle: "" });
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reload();
    if (store) {
      setSForm({
        storeName: store.storeName, tagline: store.tagline, logoImage: store.logoImage || "",
        whatsappNumber: store.whatsappNumber, instagram: store.instagram, address: store.address,
        announcement: store.announcement, heroTitle: store.heroTitle, heroSubtitle: store.heroSubtitle,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    try {
      const [p, m, o, s] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/payment-methods").then((r) => r.json()),
        fetch("/api/orders").then((r) => r.json()),
        fetch("/api/stats").then((r) => r.json()),
      ]);
      if (Array.isArray(p)) setProducts(p);
      if (Array.isArray(m)) setPays(m);
      if (Array.isArray(o)) setOrders(o);
      if (s && !s.error) setStats(s);
    } catch (e) { console.error(e); }
  }

  // ── productos ──
  function openNew() {
    setEditing(null);
    setPForm({ name: "", description: "", price: "", category: "bolsos", image: "", stock: "10", featured: false, isActive: true });
    setPFormOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setPForm({ name: p.name, description: p.description, price: String(p.price), category: p.category, image: p.image, stock: String(p.stock), featured: p.featured, isActive: p.isActive });
    setPFormOpen(true);
  }
  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fileToDataURL(f);
      setPForm((v) => ({ ...v, image: url }));
      onToast("Imagen cargada 💗");
    } catch { onToast("No se pudo leer la imagen"); }
    e.target.value = "";
  }
  async function saveProduct() {
    if (!pForm.name.trim()) { onToast("Poné un nombre 💗"); return; }
    setSaving(true);
    try {
      const payload = {
        name: pForm.name, description: pForm.description, price: Number(pForm.price) || 0,
        category: pForm.category, image: pForm.image, stock: Number(pForm.stock) || 0,
        featured: pForm.featured, isActive: pForm.isActive,
      };
      const res = editing
        ? await fetch(`/api/products/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      setPFormOpen(false);
      await reload(); onRefresh();
      onToast(editing ? "Producto actualizado 💗" : "Producto agregado 💗");
    } catch { onToast("Error al guardar"); } finally { setSaving(false); }
  }
  async function delProduct(id: number) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await reload(); onRefresh();
    onToast("Producto eliminado");
  }

  // ── pagos ──
  function openPayNew() {
    setPayForm({ id: 0, name: "", details: "", instructions: "", enabled: true });
    setPayOpen(true);
  }
  function openPayEdit(p: Pay) {
    setPayForm({ id: p.id, name: p.name, details: p.details, instructions: p.instructions, enabled: p.enabled });
    setPayOpen(true);
  }
  async function savePay() {
    if (!payForm.name.trim()) { onToast("Poné un nombre"); return; }
    setSaving(true);
    try {
      const payload = { name: payForm.name, details: payForm.details, instructions: payForm.instructions, enabled: payForm.enabled };
      if (payForm.id) await fetch(`/api/payment-methods/${payForm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      else await fetch("/api/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setPayOpen(false);
      await reload(); onRefresh();
      onToast("Medio de pago guardado 💗");
    } catch { onToast("Error al guardar"); } finally { setSaving(false); }
  }
  async function delPay(id: number) {
    if (!confirm("¿Eliminar medio de pago?")) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    await reload(); onRefresh();
    onToast("Eliminado");
  }
  async function togglePay(p: Pay) {
    await fetch(`/api/payment-methods/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, enabled: !p.enabled }) });
    await reload(); onRefresh();
  }

  // ── tienda ──
  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fileToDataURL(f, 500);
      setSForm((v) => ({ ...v, logoImage: url }));
      onToast("Logo cargado 💗");
    } catch { onToast("No se pudo leer el logo"); }
    e.target.value = "";
  }
  async function saveStore() {
    setSaving(true);
    try {
      const res = await fetch("/api/store", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sForm) });
      if (!res.ok) throw new Error();
      await reload(); onRefresh();
      onToast("Tienda actualizada 💗");
    } catch { onToast("Error al guardar"); } finally { setSaving(false); }
  }

  async function setOrderStatus(id: number, status: string) {
    await fetch(`/api/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await reload();
  }
  async function delOrder(id: number) {
    if (!confirm("¿Eliminar pedido?")) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    await reload();
  }

  function logout() {
    sessionStorage.removeItem("caprichitos_admin");
    onClose();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-pink-50">
      <div className="flex h-full flex-col lg:flex-row">
        {/* sidebar */}
        <aside className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-pink-200 bg-gradient-to-r from-pink-600 to-rose-500 p-3 text-white lg:w-64 lg:flex-col lg:items-stretch lg:gap-1 lg:overflow-visible lg:p-5">
          <div className="mr-2 flex items-center gap-2 lg:mb-6 lg:mr-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20"><Heart className="h-5 w-5" fill="currentColor" /></div>
            <div className="hidden sm:block lg:block">
              <p className="font-display text-sm font-extrabold leading-tight">Panel admin</p>
              <p className="max-w-[140px] truncate text-[11px] text-pink-100">{store?.storeName}</p>
            </div>
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:w-full ${tab === t.id ? "bg-white text-pink-600 shadow-lg" : "text-pink-100 hover:bg-white/15"}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2 lg:ml-0 lg:mt-auto lg:flex-col">
            <button onClick={() => { reload(); onRefresh(); onToast("Actualizado 💗"); }} className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25">↻ Actualizar</button>
            <button onClick={logout} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pink-600"><LogOut className="h-4 w-4" /> Salir</button>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 lg:hidden"><X className="h-5 w-5" /></button>
        </aside>

        {/* main */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 hidden items-center justify-between lg:flex">
              <h1 className="font-display text-2xl font-extrabold text-pink-950">
                {TABS.find((t) => t.id === tab)?.label} 💗
              </h1>
              <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-5 py-2.5 text-sm font-bold text-pink-600 shadow-sm hover:bg-pink-50">
                <X className="h-4 w-4" /> Ver tienda
              </button>
            </div>

            {tab === "resumen" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { icon: TrendingUp, l: "Ventas totales", v: formatPrice(stats?.totalRevenue || 0), c: "from-pink-500 to-rose-500" },
                    { icon: ClipboardList, l: "Pedidos", v: String(stats?.totalOrders || 0), c: "from-fuchsia-500 to-pink-500" },
                    { icon: Users, l: "Clientes", v: String(stats?.uniqueClients || 0), c: "from-rose-400 to-orange-400" },
                    { icon: Ticket, l: "Ticket promedio", v: formatPrice(stats?.avgTicket || 0), c: "from-pink-400 to-fuchsia-500" },
                  ].map((k) => (
                    <div key={k.l} className={`rounded-3xl bg-gradient-to-br ${k.c} p-5 text-white shadow-lg`}>
                      <k.icon className="h-6 w-6 opacity-80" />
                      <p className="font-display mt-2 text-xl font-extrabold sm:text-2xl">{k.v}</p>
                      <p className="text-xs font-semibold text-white/80">{k.l}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
                  <p className="font-display font-bold text-pink-900">Ventas últimos 14 días 📈</p>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.porDia || []}>
                        <defs>
                          <linearGradient id="gPink" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f6e" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#f43f6e" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fbcfe8" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#be185d" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#be185d" }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                        <Tooltip formatter={(v) => [formatPrice(Number(v) || 0), "Ventas"]} />
                        <Area type="monotone" dataKey="ventas" stroke="#f43f6e" strokeWidth={3} fill="url(#gPink)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
                    <p className="font-display font-bold text-pink-900">Ventas por categoría 👜</p>
                    <div className="mt-3 h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.porCategoria || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#fbcfe8" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#be185d" }} />
                          <YAxis tick={{ fontSize: 11, fill: "#be185d" }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                            {(stats?.porCategoria || []).map((_, i) => <Cell key={i} fill={PINK[i % PINK.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
                    <p className="font-display font-bold text-pink-900">Medios de pago 💳</p>
                    <div className="mt-3 h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats?.porPago || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {(stats?.porPago || []).map((_, i) => <Cell key={i} fill={PINK[i % PINK.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
                    <p className="font-display font-bold text-pink-900">Top productos ⭐</p>
                    <div className="mt-3 space-y-2">
                      {(stats?.topProductos || []).map((t, i) => (
                        <div key={i} className="flex items-center justify-between rounded-2xl bg-pink-50 px-4 py-2.5 text-sm">
                          <span className="font-bold text-pink-900">{i + 1}. {t.name} <span className="text-pink-400">x{t.qty}</span></span>
                          <span className="font-extrabold text-pink-600">{formatPrice(t.revenue)}</span>
                        </div>
                      ))}
                      {(stats?.topProductos || []).length === 0 && <p className="text-sm text-pink-400">Todavía no hay ventas registradas</p>}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
                    <p className="font-display font-bold text-pink-900">Estado de pedidos 📦</p>
                    <div className="mt-3 space-y-2">
                      {(stats?.porEstado || []).map((e) => (
                        <div key={e.name} className="flex items-center justify-between rounded-2xl bg-pink-50 px-4 py-2.5 text-sm font-bold text-pink-900">
                          <span className="capitalize">{e.name}</span><span className="rounded-full bg-white px-3 py-0.5 text-pink-600 shadow-sm">{e.value}</span>
                        </div>
                      ))}
                      {(stats?.porEstado || []).length === 0 && <p className="text-sm text-pink-400">Sin pedidos</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "productos" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-pink-500">{products.length} productos</p>
                  <button onClick={openNew} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-200"><Plus className="h-4 w-4" /> Agregar producto</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((p) => (
                    <div key={p.id} className={`flex gap-3 rounded-3xl border bg-white p-3 shadow-sm ${p.isActive ? "border-pink-100" : "border-gray-200 opacity-60"}`}>
                      {p.image ? <img src={p.image} alt={p.name} className="h-20 w-20 shrink-0 rounded-2xl object-cover" /> : (
                        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-pink-100"><Heart className="h-8 w-8 text-pink-300" fill="currentColor" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-pink-950">{p.name} {p.featured && "⭐"}</p>
                        <p className="text-xs font-bold text-pink-500">{formatPrice(p.price)} · stock {p.stock} · {p.category}</p>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => openEdit(p)} className="flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-600 hover:bg-pink-100"><Pencil className="h-3 w-3" /> Editar</button>
                          <button onClick={() => delProduct(p.id)} className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100"><Trash2 className="h-3 w-3" /> Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "pedidos" && (
              <div className="space-y-3">
                {orders.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-sm text-pink-400">No hay pedidos todavía</p>}
                {orders.map((o) => (
                  <div key={o.id} className="rounded-3xl border border-pink-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-pink-500 px-3 py-1 text-xs font-extrabold text-white">#{o.id}</span>
                      <p className="text-sm font-extrabold text-pink-950">{o.customerName}</p>
                      <span className="text-xs text-pink-400">{o.createdAt ? new Date(o.createdAt).toLocaleString("es-AR") : ""}</span>
                      <span className="ml-auto text-sm font-extrabold text-pink-600">{formatPrice(o.total)}</span>
                    </div>
                    <div className="mt-2 rounded-2xl bg-pink-50 p-3 text-xs font-semibold text-pink-900">
                      {(o.items || []).map((it, i) => <p key={i}>• {it.qty}x {it.name} — {formatPrice(it.price * it.qty)}</p>)}
                      <p className="mt-1 text-pink-500">📞 {o.customerPhone} · 📍 {o.customerAddress} · 💳 {o.paymentMethod}</p>
                      {o.customerNotes && <p>📝 {o.customerNotes}</p>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)} className="rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-bold text-pink-700 outline-none">
                        <option value="pendiente">Pendiente</option>
                        <option value="en preparación">En preparación</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <a href={`https://wa.me/${(o.customerPhone || "").replace(/\D/g, "")}`} target="_blank" className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-600"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
                      <button onClick={() => delOrder(o.id)} className="ml-auto flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "clientes" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 p-5 text-white"><Users className="h-6 w-6" /><p className="font-display mt-1 text-2xl font-extrabold">{stats?.uniqueClients || 0}</p><p className="text-xs">Clientes únicos</p></div>
                  <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-500 p-5 text-white"><Wallet className="h-6 w-6" /><p className="font-display mt-1 text-2xl font-extrabold">{formatPrice(stats?.totalRevenue || 0)}</p><p className="text-xs">Facturación</p></div>
                </div>
                {(stats?.clientes || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-3xl border border-pink-100 bg-white p-4 shadow-sm">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 font-display text-sm font-extrabold text-white">{c.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-pink-950">{c.name}</p>
                      <p className="text-xs text-pink-400">📞 {c.phone} · última compra {c.ultima}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-pink-600">{formatPrice(c.gastado)}</p>
                      <p className="text-[11px] font-bold text-pink-400">{c.pedidos} pedidos</p>
                    </div>
                  </div>
                ))}
                {(stats?.clientes || []).length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-sm text-pink-400">Sin clientes aún</p>}
              </div>
            )}

            {tab === "pagos" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-pink-500">Se muestran en la tienda y en el checkout</p>
                  <button onClick={openPayNew} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-200"><Plus className="h-4 w-4" /> Agregar</button>
                </div>
                <div className="space-y-3">
                  {pays.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-3xl border border-pink-100 bg-white p-4 shadow-sm">
                      <button onClick={() => togglePay(p)} className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${p.enabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        <Check className="h-5 w-5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-pink-950">{p.name} {!p.enabled && <span className="text-gray-400">(oculto)</span>}</p>
                        <p className="truncate text-xs text-pink-500">{p.details} {p.instructions ? `· ${p.instructions}` : ""}</p>
                      </div>
                      <button onClick={() => openPayEdit(p)} className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-600"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => delPay(p.id)} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "tienda" && (
              <div className="space-y-4 rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
                <p className="font-display text-lg font-extrabold text-pink-900">Logo y nombre de la tienda 💗</p>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-pink-50 p-4">
                  {sForm.logoImage ? <img src={sForm.logoImage} alt="logo" className="h-20 w-20 rounded-2xl object-cover shadow" /> : (
                    <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500"><Heart className="h-10 w-10 text-white" fill="currentColor" /></div>
                  )}
                  <div>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                    <button onClick={() => logoRef.current?.click()} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-pink-600 shadow hover:bg-pink-100">
                      <ImagePlus className="h-4 w-4" /> Elegir logo del dispositivo
                    </button>
                    <p className="mt-1 text-[11px] text-pink-400">Se elige desde la galería, no por URL</p>
                    {sForm.logoImage && <button onClick={() => setSForm({ ...sForm, logoImage: "" })} className="mt-1 text-[11px] font-bold text-red-400">Quitar logo</button>}
                  </div>
                </div>
                {[
                  ["storeName", "Nombre de la tienda", "caprichitos_cosas_lindas"],
                  ["tagline", "Frase / descripción corta", ""],
                  ["whatsappNumber", "WhatsApp (con código país, ej 54911…)", ""],
                  ["instagram", "Instagram (solo usuario)", ""],
                  ["address", "Dirección / envíos", ""],
                  ["announcement", "Anuncio superior", ""],
                  ["heroTitle", "Título principal", ""],
                  ["heroSubtitle", "Subtítulo principal", ""],
                ].map(([k, label, ph]) => (
                  <label key={k} className="block">
                    <span className="mb-1 block text-xs font-bold text-pink-500">{label}</span>
                    <input
                      value={(sForm as unknown as Record<string, string>)[k] || ""}
                      onChange={(e) => setSForm({ ...sForm, [k]: e.target.value })}
                      placeholder={ph}
                      className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                    />
                  </label>
                ))}
                <button onClick={saveStore} disabled={saving} className="w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-bold text-white shadow-lg shadow-pink-200 disabled:opacity-60">
                  {saving ? "Guardando…" : "Guardar cambios 💗"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* modal producto */}
      {pFormOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-pink-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-extrabold text-pink-900">{editing ? "Editar producto" : "Nuevo producto"} 💗</p>
              <button onClick={() => setPFormOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-pink-50 text-pink-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4 rounded-2xl bg-pink-50 p-3">
                {pForm.image ? <img src={pForm.image} alt="prev" className="h-20 w-20 rounded-2xl object-cover shadow" /> : (
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white"><ImagePlus className="h-8 w-8 text-pink-300" /></div>
                )}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-pink-600 shadow">
                    <ImagePlus className="h-4 w-4" /> Elegir foto del dispositivo
                  </button>
                  <p className="mt-1 text-[11px] text-pink-400">Galería del celu / compu, sin URLs</p>
                </div>
              </div>
              <input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} placeholder="Nombre *" className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
              <textarea value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} placeholder="Descripción" rows={2} className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
              <div className="grid grid-cols-2 gap-3">
                <input value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} placeholder="Precio" inputMode="numeric" className="rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
                <input value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} placeholder="Stock" inputMode="numeric" className="rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
              </div>
              <select value={pForm.category} onChange={(e) => setPForm({ ...pForm, category: e.target.value })} className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400">
                <option value="bolsos">👜 Bolsos</option>
                <option value="mochilas">🎒 Mochilas</option>
                <option value="vasos">🥤 Vasos térmicos</option>
                <option value="combos">🎁 Combos</option>
                <option value="otros">💗 Otros</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setPForm({ ...pForm, featured: !pForm.featured })} className={`flex-1 rounded-full border py-2 text-xs font-bold ${pForm.featured ? "border-pink-500 bg-pink-50 text-pink-600" : "border-pink-100 text-pink-300"}`}>⭐ Destacado</button>
                <button onClick={() => setPForm({ ...pForm, isActive: !pForm.isActive })} className={`flex-1 rounded-full border py-2 text-xs font-bold ${pForm.isActive ? "border-green-400 bg-green-50 text-green-600" : "border-gray-200 text-gray-400"}`}>{pForm.isActive ? "✓ Visible" : "Oculto"}</button>
              </div>
              <button onClick={saveProduct} disabled={saving} className="w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">
                {saving ? "Guardando…" : editing ? "Guardar cambios 💗" : "Agregar producto 💗"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal pago */}
      {payOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-pink-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-extrabold text-pink-900">Medio de pago 💳</p>
              <button onClick={() => setPayOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-pink-50 text-pink-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <input value={payForm.name} onChange={(e) => setPayForm({ ...payForm, name: e.target.value })} placeholder="Nombre (ej: Mercado Pago)" className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
              <input value={payForm.details} onChange={(e) => setPayForm({ ...payForm, details: e.target.value })} placeholder="Detalles (alias, CBU…)" className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
              <input value={payForm.instructions} onChange={(e) => setPayForm({ ...payForm, instructions: e.target.value })} placeholder="Instrucciones" className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-400" />
              <button onClick={() => setPayForm({ ...payForm, enabled: !payForm.enabled })} className={`w-full rounded-full border py-2 text-xs font-bold ${payForm.enabled ? "border-green-400 bg-green-50 text-green-600" : "border-gray-200 text-gray-400"}`}>{payForm.enabled ? "✓ Habilitado" : "Deshabilitado"}</button>
              <button onClick={savePay} disabled={saving} className="w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">
                {saving ? "Guardando…" : "Guardar 💗"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
