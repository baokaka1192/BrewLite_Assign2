'use client';
import { motion } from 'motion/react';
import { Coffee, Droplets, FlaskConical, Snowflake } from 'lucide-react';
import { brewMethods } from '@/content/landing';

const icons = [Coffee, Droplets, FlaskConical, Snowflake];

export function BrewMethods() {
  return (
    <section className="bg-accent/15 px-6 py-16 md:px-12">
      <div className="container-page grid grid-cols-2 gap-10 md:grid-cols-4">
        {brewMethods.map((m, i) => {
          const Icon = icons[i];
          return (
            <motion.div
              key={m.name}
              className="text-center"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            >
              <Icon className="mx-auto h-7 w-7 text-primary" aria-hidden />
              <p className="mt-3 text-sm font-medium">{m.name}</p>
              <p className="mt-1 font-display text-sm italic text-muted-foreground">{m.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
