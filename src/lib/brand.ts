/** One place for everything name-shaped. Rename the company here. */

export const BRAND = {
  name: "SUPERCOMPUTERS",
  legal: "Supercomputers (Pvt) Ltd",
  tagline: "Servers and AI machines, built and supported in Pakistan.",
  strapline:
    "Refurbished server clusters, GPU machines and AI workstations. Put yours together online, we check it fits, and we look after it here.",
  cities: ["Lahore", "Karachi", "Islamabad"],
  hq: "Lahore",
  email: "sales@supercomputers.pk",
  phone: "+92 42 3500 0000",
  hours: "Mon-Sat, 09:00-19:00 PKT",
} as const;

/**
 * The configurator is the product; it leads.
 *
 * Quoting is deliberately not a nav destination. A quote only means something
 * attached to a configuration, so you reach it from the configurator with the
 * build in hand rather than landing on an empty form.
 */
export const NAV = [
  { href: "/configure", label: "Build one", desc: "Pick parts, we check they work together" },
  { href: "/systems", label: "Systems", desc: "Machines and clusters ready to order" },
  { href: "/catalog", label: "Parts", desc: "Everything we stock, with filters" },
] as const;

/** Used on the home page. Plain claims we can actually stand behind. */
export const PILLARS = [
  {
    k: "01",
    title: "We check the build before we price it",
    body: "The builder runs the same checks our engineers do by hand: does the processor fit the board, is there enough power, will the card physically go in, can the case be cooled. It tells you what will not work and why, before you have paid for anything.",
  },
  {
    k: "02",
    title: "We say what condition it is in",
    body: "Six grades, each with a written list of the tests it passed and how long it is covered for. If a part came out of a working machine, we label it that way. On used drives we publish how much life is left rather than hiding it.",
  },
  {
    k: "03",
    title: "One company to deal with",
    body: "Every part comes from our own stock or our own import licence. You buy from us, we deliver it, and if something goes wrong you call us. Not six suppliers who each blame the other five.",
  },
  {
    k: "04",
    title: "Built for how things work here",
    body: "230V mains, three-phase once the load gets big, load-shedding and switching over to a generator, and summer temperatures that turn a just-about-adequate cooler into a real problem. All of that is in the checks.",
  },
] as const;
