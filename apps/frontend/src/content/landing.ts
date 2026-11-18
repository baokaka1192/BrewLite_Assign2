// All landing-page copy lives here so it can be edited without touching components.
export const brand = {
  name: 'BrewLite',
  tagline: 'Specialty Coffee · Ho Chi Minh City',
  address: '273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh',
  hours: 'Monday–Friday 7am–9pm · Saturday–Sunday 8am–9pm',
  year: 2026,
};

export const navLinks = [
  { label: 'Menu', href: '#menu' },
  { label: 'Our Coffee', href: '#coffee' },
  { label: 'About', href: '#about' },
  { label: 'Find Us', href: '#find-us' },
];

export const hero = {
  headline: ['Good Coffee.', 'Good People.', 'Great Days.'],
  sub: 'Single-origin espresso, seasonal filter, and everything baked from scratch',
  chips: ['Specialty Roaster', 'Organic Milk', 'Cashless Ordering'],
  openChip: { label: 'Open today', value: '7am–9pm' },
  src: '/images/landing/hero.jpg',
  alt: 'Sunlit café interior with wooden tables and warm lighting',
  imageBrief:
    'Warm independent coffee shop interior, wooden tables, Edison bulbs, exposed brick, morning light',
};

export const menuHighlights = [
  { name: 'Espresso Drinks', src: '/images/menu/cappuccino.jpg', desc: 'Flat white, cortado, oat latte', price: 'from 35.000đ', brief: 'Flat white with latte art on warm wooden table' },
  { name: 'Filter Coffee', src: '/images/menu/ca-phe-den-da.jpg', desc: 'V60, Chemex, cold brew', price: 'from 40.000đ', brief: 'V60 pour over being brewed, ceramic dripper, steam' },
  { name: 'All-Day Brunch', src: '/images/menu/banh-mi-pate-trung.jpg', desc: 'Avocado toast, eggs, granola', price: 'from 85.000đ', brief: 'Avocado toast brunch plate, artisan bread, eggs' },
  { name: 'Baked Goods', src: '/images/menu/croissant-bo.jpg', desc: 'Croissants, banana bread, seasonal cakes', price: 'from 30.000đ', brief: 'Fresh croissants and pastries on marble counter' },
];

export const brewMethods = [
  { name: 'Espresso', desc: 'Dense, sweet and syrupy.' },
  { name: 'V60', desc: 'Clean, bright and floral.' },
  { name: 'Chemex', desc: 'Light-bodied and crisp.' },
  { name: 'Cold Brew', desc: 'Slow, smooth, 18 hours.' },
];

export const ourCoffee = {
  title: 'From Farm to Cup',
  quote: 'Every bag tells the story of the farmer who grew it.',
  paragraphs: [
    'We buy direct from small farms so growers are paid fairly and we know exactly where each lot comes from. Every coffee on our bar is single origin.',
    'Three origins rotate with the seasons, so the menu always tastes of what is at its best right now. Everything is roasted in small batches in Ho Chi Minh City.',
  ],
  chips: ['Direct Trade', 'Single Origin', 'Seasonal Rotating'],
  srcs: ['/images/landing/beans-sack.jpg', '/images/landing/beans-table.jpg'],
  alts: ['Roasted coffee beans in a burlap sack with a scoop', 'Roasted coffee beans on a wooden table'],
  briefs: ['Coffee beans poured from a burlap sack, warm studio light', 'Roasted beans close-up, rustic table'],
};

export const about = {
  title: 'Opened with One Machine and a Big Idea',
  paragraphs: [
    'BrewLite started in 2019 when Jamie Walsh, a former accountant, left his desk job to open the café he always wanted to walk into.',
    'One espresso machine, a handful of tables, and a rule that nobody queues longer than they need to. Today that means ordering and paying from your phone, then picking up at the bar.',
  ],
  chips: ['Est. 2019', 'Specialty SCA', 'Community Hub'],
  src: '/images/landing/about.jpg',
  alt: 'Smiling baristas behind the café counter',
  brief: 'Coffee shop owner behind the bar, smiling, casual apron, natural light',
};

export const gallery = [
  { src: '/images/landing/latte-art.jpg', alt: 'Latte art poured into a white ceramic cup', brief: 'Latte art poured into a ceramic cup' },
  { src: '/images/landing/friends.jpg', alt: 'Two friends chatting at a café table', brief: 'Two friends chatting over coffee, afternoon light' },
  { src: '/images/landing/shopfront.jpg', alt: 'Independent café shopfront with signage and plants', brief: 'Independent shopfront, plants, chalkboard sign' },
  { src: '/images/landing/grinder.jpg', alt: 'Coffee grinder with freshly ground coffee', brief: 'Barista grinding beans, morning routine' },
  { src: '/images/landing/iced-coffee.jpg', alt: 'Iced coffee in a glass', brief: 'Seasonal iced filter coffee in a glass' },
];

export const events = {
  title: 'Hire the Space',
  body: 'Available for private hire evenings and weekends — coffee cuppings, team breakfasts, and popup events',
  chips: ['Private Hire', 'Coffee Cuppings'],
};

export const testimonials = [
  { quote: 'Best flat white in the district, no competition. The banana bread is dangerous.', name: '@coffeelover', visit: 'Google Review' },
  { quote: 'Ordered from my seat, paid in two taps, and my drink was waiting at the bar.', name: 'Minh A.', visit: 'Regular, weekday mornings' },
  { quote: 'A proper neighbourhood café. The seasonal filter changed how I think about coffee.', name: 'Linh T.', visit: 'Weekend visit' },
];
