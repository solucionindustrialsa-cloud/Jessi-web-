export function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(n || 0);
}

export function waLink(phone: string, message: string) {
  const clean = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

// Comprime imagen elegida del dispositivo a dataURL (máx 900px, jpeg 0.85)
export function fileToDataURL(file: File, maxSize = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const scale = Math.min(1, maxSize / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(reader.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

export function buildOrderMessage(
  storeName: string,
  items: CartItem[],
  total: number,
  customer: { name: string; address: string; notes: string; payment: string }
) {
  const lines = [
    `💗 *Nuevo pedido · ${storeName}* 💗`,
    ``,
    ...items.map((it) => `• ${it.qty}x ${it.name} — ${formatPrice(it.price * it.qty)}`),
    ``,
    `*Total: ${formatPrice(total)}*`,
    ``,
    `👤 Nombre: ${customer.name}`,
    customer.address ? `📍 Dirección: ${customer.address}` : ``,
    `💳 Pago: ${customer.payment}`,
    customer.notes ? `📝 Notas: ${customer.notes}` : ``,
  ].filter((l) => l !== `` || true);
  return lines.join("\n");
}

export const CATEGORIES = [
  { id: "todos", label: "Todo", emoji: "💗" },
  { id: "bolsos", label: "Bolsos", emoji: "👜" },
  { id: "mochilas", label: "Mochilas", emoji: "🎒" },
  { id: "vasos", label: "Vasos térmicos", emoji: "🥤" },
  { id: "combos", label: "Combos", emoji: "🎁" },
];
