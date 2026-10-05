import test from "node:test";
import assert from "node:assert/strict";
import { isProduct, isCart, refreshDelay } from "../lib/catalog-data";

const product = { id:"p1",name:"Pads",sku:"SKU",priceMinor:20000,available:true,slug:"pads",description:"Pack",image:"/products/wellisha-xl.jpg",categoryId:null,basePriceMinor:20000,discountMinor:0,offerTitle:"Pack offer",offerSummary:"3 for ₹499",priceVersion:1,currency:"INR" };
test("cart validates server bundle totals rather than multiplying a display price", () => {
  const cart = { items:[{id:"c1",quantity:3,product,lineTotalMinor:49900,lineDiscountMinor:10100,purchasable:true}],subtotalMinor:49900,savingsMinor:10100,currency:"INR",pricedAt:"2026-10-05T12:00:00Z",refreshAfterMs:15000 };
  assert.equal(isCart(cart),true);
  assert.equal(isCart({...cart,subtotalMinor:60000}),false);
  assert.equal(isCart({...cart,items:[{...cart.items[0],lineDiscountMinor:0}]}),false);
});
test("unsafe money, invalid single-unit savings and malformed offers are rejected", () => {
  assert.equal(isProduct(product),true);
  assert.equal(isProduct({...product,priceMinor:Number.MAX_SAFE_INTEGER+1}),false);
  assert.equal(isProduct({...product,discountMinor:1}),false);
  assert.equal(isProduct({...product,offerTitle:23}),false);
});
test("refresh timing is bounded and schedule boundary responses refresh sooner", () => {
  assert.equal(refreshDelay(2300),2300);
  assert.equal(refreshDelay(0),1000);
  assert.equal(refreshDelay(60000),15000);
  assert.equal(refreshDelay(NaN),15000);
});
