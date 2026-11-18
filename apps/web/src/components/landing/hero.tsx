'use client';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/shared/chip';
import { ImageFrame } from '@/components/shared/image-frame';
import { brand, hero } from '@/content/landing';

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // Scroll-linked: copy fades slightly and the photo drifts down (parallax). Static when reduced motion is on.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);
  const artY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  return (
    <section ref={ref} id="top" className="relative overflow-hidden bg-background">
      {/* Faint warm glow behind the copy; static, no animation */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-accent/15 blur-3xl"
      />
      <div className="container-page grid items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:gap-16 md:px-12 md:pb-28 md:pt-20">
        <motion.div style={reduce ? undefined : { opacity: copyOpacity }}>
          <motion.div
            className="relative z-10 flex flex-col items-center text-center md:items-start md:text-left"
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.p variants={item} className="label text-primary">{brand.tagline}</motion.p>
            <motion.h1
              variants={item}
              className="mt-5 font-bold leading-[1.02] tracking-[-0.02em] text-foreground"
              style={{ fontSize: 'clamp(44px, 5.6vw, 84px)' }}
            >
              {hero.headline[0]}<br />
              {hero.headline[1]}<br />
              <em className="font-normal text-accent-text">{hero.headline[2]}</em>
            </motion.h1>
            <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              {hero.sub}
            </motion.p>
            <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Button asChild><a href="#menu">See our menu →</a></Button>
              <Button asChild variant="ghost"><a href="#find-us">Find us</a></Button>
            </motion.div>
            <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start">
              {hero.chips.map((c) => <Chip key={c} tone="amber">{c}</Chip>)}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto w-full max-w-[420px] md:max-w-none"
          style={reduce ? undefined : { y: artY }}
          initial={reduce ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          {/* Offset amber frame behind the arch */}
          <div
            aria-hidden
            className="absolute -bottom-4 -right-4 h-full w-full rounded-t-[999px] rounded-b-[28px] border-2 border-accent/70 md:-bottom-6 md:-right-6"
          />
          <ImageFrame
            src={hero.src}
            alt={hero.alt}
            priority
            sizes="(min-width: 768px) 45vw, 100vw"
            brief={hero.imageBrief}
            position="object-[50%_35%]"
            className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[28px] shadow-warm md:aspect-[3/4]"
          />
          <div className="absolute -left-4 bottom-10 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-warm backdrop-blur md:-left-10">
            <p className="label text-primary">{hero.openChip.label}</p>
            <p className="mt-1 font-display text-lg text-foreground">{hero.openChip.value}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
