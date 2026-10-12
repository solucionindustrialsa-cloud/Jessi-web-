import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const storeConfig = pgTable("store_config", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("caprichitos_cosas_lindas"),
  tagline: text("tagline").notNull().default("Bolsos, mochilas y vasos térmicos con amor 💗"),
  logoImage: text("logo_image").notNull().default(""),
  whatsappNumber: text("whatsapp_number").notNull().default("5491123456789"),
  instagram: text("instagram").notNull().default("caprichitos_cosas_lindas"),
  address: text("address").notNull().default("Argentina · Envíos a todo el país"),
  announcement: text("announcement").notNull().default("✨ Envíos a todo el país · Pedidos por WhatsApp ✨"),
  heroTitle: text("hero_title").notNull().default("Cosas lindas que te hacen feliz"),
  heroSubtitle: text("hero_subtitle")
    .notNull()
    .default("Bolsos, mochilas y vasos térmicos únicos, elegidos con amor para vos."),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0),
  category: text("category").notNull().default("bolsos"),
  image: text("image").notNull().default(""),
  stock: integer("stock").notNull().default(10),
  featured: boolean("featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  details: text("details").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull().default(""),
  customerAddress: text("customer_address").notNull().default(""),
  customerNotes: text("customer_notes").notNull().default(""),
  items: jsonb("items").notNull().$type<
    { productId: number; name: string; price: number; qty: number; image?: string }[]
  >(),
  total: integer("total").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("WhatsApp"),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type StoreConfig = typeof storeConfig.$inferSelect;
export type Product = typeof products.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Order = typeof orders.$inferSelect;
