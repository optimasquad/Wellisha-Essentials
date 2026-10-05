CREATE TABLE category (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE product ADD COLUMN slug TEXT;
ALTER TABLE product ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE product ADD COLUMN image_path TEXT NOT NULL DEFAULT '/products/wellisha-hero.jpg';
ALTER TABLE product ADD COLUMN category_id TEXT REFERENCES category(id);
ALTER TABLE product ADD COLUMN price_version BIGINT NOT NULL DEFAULT 0 CHECK(price_version >= 0);
ALTER TABLE product ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE product ADD CONSTRAINT product_price_safe CHECK(price_minor <= 1801439850948);
CREATE UNIQUE INDEX product_public_slug ON product(COALESCE(slug,id));
CREATE TABLE product_offer (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES product(id),
  price_version BIGINT NOT NULL, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
  kind TEXT NOT NULL CHECK(kind IN ('PERCENTAGE','FIXED_AMOUNT','BUNDLE_PRICE','BUY_X_GET_Y')),
  value BIGINT NOT NULL CHECK(value >= 0),
  buy_quantity INTEGER NOT NULL CHECK(buy_quantity BETWEEN 1 AND 100),
  free_quantity INTEGER NOT NULL CHECK(free_quantity BETWEEN 0 AND 99),
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  CHECK(ends_at > starts_at), CHECK(kind <> 'PERCENTAGE' OR value BETWEEN 1 AND 10000),
  CHECK(kind <> 'FIXED_AMOUNT' OR value > 0),
  CHECK(kind <> 'BUNDLE_PRICE' OR buy_quantity >= 2),
  CHECK((kind='BUY_X_GET_Y' AND value=0 AND free_quantity>0 AND buy_quantity+free_quantity<=100)
     OR (kind<>'BUY_X_GET_Y' AND free_quantity=0))
);
CREATE INDEX product_offer_version ON product_offer(product_id,price_version,starts_at,ends_at);
CREATE TABLE staff_permission (
  issuer TEXT NOT NULL, subject TEXT NOT NULL, permission TEXT NOT NULL,
  PRIMARY KEY(issuer,subject,permission)
);
CREATE TABLE pricing_audit (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES product(id),
  actor_id TEXT NOT NULL REFERENCES customer(id), price_version BIGINT NOT NULL,
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 240),
  snapshot JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id,price_version)
);
CREATE TABLE cart_item (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customer(id),
  product_id TEXT NOT NULL REFERENCES product(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(customer_id,product_id)
);
CREATE INDEX cart_item_owner ON cart_item(customer_id,created_at);
ALTER TABLE order_line ADD COLUMN base_unit_price_minor BIGINT;
ALTER TABLE order_line ADD COLUMN discount_minor BIGINT NOT NULL DEFAULT 0;
ALTER TABLE order_line ADD COLUMN price_version BIGINT;
ALTER TABLE order_line ADD COLUMN offer_title TEXT;
