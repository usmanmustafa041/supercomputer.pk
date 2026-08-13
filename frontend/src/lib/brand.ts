/** One place for everything name-shaped. Rename the company here. */

export const BRAND = {
  name: "SUPERCOMPUTERS",
  legal: "Supercomputers (Pvt) Ltd",
  tagline: "Servers and AI systems, built and supported in Pakistan.",
  strapline:
    "Refurbished server clusters, GPU systems and AI workstations. Specify yours online, we verify the configuration, and we support it here.",
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
  { href: "/configure", label: "Configurator", desc: "Select parts and we verify they work together" },
  { href: "/systems", label: "Systems", desc: "Machines and clusters ready to order" },
  { href: "/catalog", label: "Catalogue", desc: "Every part we hold, with filters" },
] as const;

/** Used on the home page. Claims we can stand behind, stated plainly. */
export const PILLARS = [
  {
    k: "01",
    title: "The configuration is verified before it is quoted",
    body: "The configurator runs the same checks our engineers run by hand: does the processor fit the board, is there enough power, will the card physically go in, can the chassis be cooled. It reports what will not work and why, before any money changes hands.",
  },
  {
    k: "02",
    title: "Condition is graded, in writing",
    body: "Six grades, each with a published list of the tests it passed and the warranty term that follows. A part pulled from a working machine is labelled as one. On used drives we publish the remaining endurance rather than omitting it.",
  },
  {
    k: "03",
    title: "One supplier, start to finish",
    body: "Every part comes from our own stock or our own import licence. You buy from us, we deliver it, and if something fails you call us. Not six suppliers who each refer you to the other five.",
  },
  {
    k: "04",
    title: "Specified for conditions here",
    body: "230V mains, three-phase once the load grows, load-shedding and generator transfer, and summer ambients that turn a marginal cooler into a real problem. All of it is accounted for in the checks.",
  },
] as const;
