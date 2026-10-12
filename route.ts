import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { storeConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(storeConfig).limit(1);
    if (rows.length === 0) {
      const inserted = await db
        .insert(storeConfig)
        .values({})
        .returning();
      return NextResponse.json(inserted[0]);
    }
    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener tienda" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = await db.select().from(storeConfig).limit(1);
    if (rows.length === 0) {
      const inserted = await db.insert(storeConfig).values({
        storeName: body.storeName ?? "caprichitos_cosas_lindas",
        tagline: body.tagline ?? "",
        logoImage: body.logoImage ?? "",
        whatsappNumber: body.whatsappNumber ?? "",
        instagram: body.instagram ?? "",
        address: body.address ?? "",
        announcement: body.announcement ?? "",
        heroTitle: body.heroTitle ?? "",
        heroSubtitle: body.heroSubtitle ?? "",
      }).returning();
      return NextResponse.json(inserted[0]);
    }
    const updated = await db
      .update(storeConfig)
      .set({
        storeName: body.storeName ?? rows[0].storeName,
        tagline: body.tagline ?? rows[0].tagline,
        logoImage: body.logoImage !== undefined ? body.logoImage : rows[0].logoImage,
        whatsappNumber: body.whatsappNumber ?? rows[0].whatsappNumber,
        instagram: body.instagram ?? rows[0].instagram,
        address: body.address ?? rows[0].address,
        announcement: body.announcement ?? rows[0].announcement,
        heroTitle: body.heroTitle ?? rows[0].heroTitle,
        heroSubtitle: body.heroSubtitle ?? rows[0].heroSubtitle,
        updatedAt: new Date(),
      })
      .where(eq(storeConfig.id, rows[0].id))
      .returning();
    return NextResponse.json(updated[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al guardar tienda" }, { status: 500 });
  }
}
