/**
 * The domain, shared by both tiers.
 *
 * What lives here is everything that describes the business rather than the
 * plumbing: what a part is, what a build is, and whether a given build will
 * actually work. It has no idea that a database or an HTTP server exists, and
 * that is the point. It compiles once and both the API and the web tier import
 * the same compiled copy, so there is no second definition of a product to
 * drift out of step.
 *
 * Two things in particular are here rather than behind the API:
 *
 * The catalogue is generated, not stored. 2,781 parts are expanded from a few
 * hundred family definitions, so the "database" of browsable parts is a pure
 * function. The API seeds from it and the web tier browses it directly, which
 * saves a round trip per page for data that cannot change between them.
 *
 * The compatibility engine runs in the browser. The configurator re-checks a
 * build on every click, and a network round trip per click would make it feel
 * broken. The API runs the same engine on the same input when a quote is
 * submitted, so the browser's answer is a preview and the server's is the one
 * that counts.
 */

export * as catalog from "./catalog";
export * as compat from "./compat";

export * from "./catalog/types";
export {
  allProducts,
  catalogSize,
  fmtNum,
  fmtPkr,
  fmtPkrShort,
  getById,
  getByKind,
  getBySlug,
  getFamily,
  kindCounts,
  search,
  searchProducts,
  slugify,
  FX_USD_PKR,
  type Query,
  type SearchResult,
} from "./catalog";
export { resolveFamilies } from "./catalog/resolve";
export { suggestChassis, suitsTarget } from "./catalog/fit";

export {
  checkBuild,
  computePower,
  summarise,
  type Build,
  type BuildLine,
  type BuildSummary,
  type CompatReport,
  type Finding,
} from "./compat/engine";
export { TARGET_LABEL, type Severity, type Target } from "./compat/types";
