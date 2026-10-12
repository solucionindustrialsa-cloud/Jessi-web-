"use client";
import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function TiltCard({
  children,
  className = "",
  max = 14,
  scale = 1.03,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ x: (0.5 - py) * max * 2, y: (px - 0.5) * max * 2 });
    setPos({ x: px * 100, y: py * 100 });
  }

  return (
    <div className={`perspective-1000 ${className}`} style={{ perspective: 1100 }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setT({ x: 0, y: 0 }); }}
        className="card-3d relative h-full w-full"
        style={{
          transform: `rotateX(${t.x}deg) rotateY(${t.y}deg) scale(${hover ? scale : 1})`,
        }}
      >
        {children}
        {glare && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
            style={{
              opacity: hover ? 1 : 0,
              background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,.45), transparent 55%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function Scroll3D({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 70, rotateX: 28, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, type: "spring", bounce: 0.22 }}
      style={{ transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
}

export function ParallaxFloat({
  children,
  className = "",
  speed = 60,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-6, 6]);
  return (
    <motion.div ref={ref} style={{ y, rotate }} className={className}>
      {children}
    </motion.div>
  );
}
