export interface ProductRow {
  id: number;
  sku: string;
  slug: string;
  kind: string;
  brand: string;
  model: string;
  mpn: string | null;
  family: string;
  condition: string;
  segment: string;
  price_pkr: number;
  price_on_request: boolean;
  stock_qty: number;
  lead_days: number;
  indent_only: boolean;
  warranty_months: number;
  release_year: number;
  search_key: string;
  highlights: string[];
  tags: string[];
  specs: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductImageRow {
  id: number;
  sku: string;
  object_key: string;
  original_name: string | null;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  position: number;
}

/** A page of results, whatever is being paged. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
