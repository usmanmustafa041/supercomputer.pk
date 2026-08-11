/** One place for everything name-shaped. Rename the company here. */

export const BRAND = {
  name: "TERAFORGE",
  legal: "Teraforge Compute (Pvt) Ltd",
  tagline: "Compute infrastructure, delivered in Pakistan.",
  strapline:
    "Refurbished HPC clusters, GPU servers and AI workstations — configured, compatibility-checked and supported locally.",
  cities: ["Lahore", "Karachi", "Islamabad"],
  hq: "Lahore",
  email: "sales@teraforge.pk",
  phone: "+92 42 3500 0000",
  hours: "Mon-Sat, 09:00-19:00 PKT",
} as const;

export const NAV = [
  { href: "/catalog", label: "Catalog", desc: "Every part we sell, filterable" },
  { href: "/configure", label: "Configurator", desc: "Build it, we check it" },
  { href: "/systems", label: "Systems", desc: "Prebuilt nodes and clusters" },
  { href: "/sourcing", label: "Sourcing", desc: "Where parts come from" },
] as const;

/** Used on the home page. Deliberately not superlatives. */
export const PILLARS = [
  {
    k: "01",
    title: "Every configuration is checked before it is quoted",
    body: "The configurator runs the same rule set our build engineers use: socket and lane budgets, memory channel population, power connector counts, rack depth, airflow. It tells you what will not work and why, before money changes hands.",
  },
  {
    k: "02",
    title: "Refurbished hardware, stated honestly",
    body: "Six condition grades, each with a defined test regime and warranty term. Tested pulls are labelled as tested pulls. We publish remaining endurance on used drives rather than hiding it.",
  },
  {
    k: "03",
    title: "If we do not have it, we say where does",
    body: "Our own stock is checked first. When we are out, the configurator links to verified Pakistani retailers that carry the part. We would rather send you elsewhere than sit on an order for six weeks.",
  },
  {
    k: "04",
    title: "Specified for Pakistani conditions",
    body: "230V mains, three-phase where the load demands it, load-shedding and generator transfer, ambient temperatures that make a marginal cooler a real problem. The rules account for all of it.",
  },
] as const;
