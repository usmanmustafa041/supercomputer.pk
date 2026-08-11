/** One place for everything name-shaped. Rename the company here. */

export const BRAND = {
  name: "SUPERCOMPUTERS",
  legal: "Supercomputers (Pvt) Ltd",
  tagline: "Compute infrastructure, delivered in Pakistan.",
  strapline:
    "Refurbished HPC clusters, GPU servers and AI workstations — configured, compatibility-checked and supported locally.",
  cities: ["Lahore", "Karachi", "Islamabad"],
  hq: "Lahore",
  email: "sales@supercomputers.pk",
  phone: "+92 42 3500 0000",
  hours: "Mon-Sat, 09:00-19:00 PKT",
} as const;

/** The configurator is the product; it leads. */
export const NAV = [
  { href: "/configure", label: "Configurator", desc: "Build it, we check it" },
  { href: "/systems", label: "Systems", desc: "Prebuilt nodes and clusters" },
  { href: "/catalog", label: "Catalog", desc: "Every part we stock, filterable" },
  { href: "/quote", label: "Request a quote", desc: "Send us a configuration" },
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
    title: "One supplier, one invoice, one warranty",
    body: "Every part in the configurator comes from our own inventory or our own import channel. You deal with us for the build, the delivery and anything that goes wrong afterwards — not with six vendors who each blame the others.",
  },
  {
    k: "04",
    title: "Specified for Pakistani conditions",
    body: "230V mains, three-phase where the load demands it, load-shedding and generator transfer, ambient temperatures that make a marginal cooler a real problem. The rules account for all of it.",
  },
] as const;
