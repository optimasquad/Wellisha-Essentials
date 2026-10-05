CREATE TABLE product_bundle_component (
  bundle_product_id TEXT NOT NULL REFERENCES product(id), component_product_id TEXT NOT NULL REFERENCES product(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100), PRIMARY KEY(bundle_product_id,component_product_id),
  CHECK(bundle_product_id!=component_product_id)
);
