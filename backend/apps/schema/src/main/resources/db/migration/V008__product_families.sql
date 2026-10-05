CREATE TABLE product_family (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  slug TEXT NOT NULL UNIQUE CHECK(length(slug) BETWEEN 1 AND 120)
);
ALTER TABLE product ADD COLUMN family_id TEXT REFERENCES product_family(id);
ALTER TABLE product ADD COLUMN variant_label TEXT NOT NULL DEFAULT '' CHECK(length(variant_label)<=120);
CREATE INDEX product_family_members ON product(family_id,id) WHERE active=true;
