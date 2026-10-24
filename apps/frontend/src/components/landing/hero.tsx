'use client';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/shared/chip';
import { ImageFrame } from '@/components/shared/image-frame';
import { brand, hero } from '@/content/landing';

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

export function Hero() {
  return (
    <section id="top" className="relative bg-background">
      <div className="relative h-[68vh] min-h-[360px] w-full">
        <ImageFrame alt="BrewLite café interior" brief={hero.imageBrief} className="h-full w-full" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(250,246,239,1) 0%, transparent 45%)' }}
        />
      </div>

      <motion.div
        className="relative z-10 -mt-24 flex flex-col items-center px-6 pb-20 text-center"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
      >
        <motion.p variants={item} className="label">{brand.tagline}</motion.p>
        <motion.h1
          variants={item}
          className="mt-4 font-bold leading-[1.02] text-foreground"
          style={{ fontSize: 'clamp(52px, 7vw, 110px)' }}
        >
          {hero.headline[0]}<br />
          {hero.headline[1]}<br />
          <em className="font-normal text-accent">{hero.headline[2]}</em>
        </motion.h1>
        <motion.p variants={item} className="mt-6 max-w-xl text-lg text-muted-foreground">{hero.sub}</motion.p>
        <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild><a href="#menu">See our menu →</a></Button>
          <Button asChild variant="ghost"><a href="#find-us">Find us</a></Button>
        </motion.div>
        <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-2">
          {hero.chips.map((c) => <Chip key={c} tone="amber">{c}</Chip>)}
        </motion.div>
      </motion.div>
    </section>
  );
}
