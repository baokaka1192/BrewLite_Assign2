'use client';
import { motion, useReducedMotion } from 'motion/react';
import { Coffee, Droplets, FlaskConical, Snowflake } from 'lucide-react';
import { brewMethods } from '@/content/landing';

const icons = [Coffee, Droplets, FlaskConical, Snowflake];

export function BrewMethods() {
  const reduce = useReducedMotion();
  return (
    <section className="border-y border-border bg-background px-6 py-10 md:px-12 md:py-12">
      <div className="container-page grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
        {brewMethods.map((m, i) => {
          const Icon = icons[i];
          return (
            <motion.div
              key={m.name}
              className="text-center"
              initial={reduce ? false : { opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.1, ease: 'easeOut' }}
            >
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold">{m.name}</p>
              <p className="mt-1 font-display text-sm italic text-muted-foreground">{m.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
