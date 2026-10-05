package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import java.sql.ResultSet
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Repository
class CatalogPricingRepository(private val jdbc: JdbcClient, private val mapper: ObjectMapper) {
    fun databaseTime(): Instant = jdbc.sql("SELECT statement_timestamp()").query { rs,_ -> rs.getTimestamp(1).toInstant() }.single()
    private val productSql = """SELECT p.*,COALESCE(p.slug,p.id) AS public_slug,
        o.title AS offer_title,o.kind AS offer_kind,o.value AS offer_value,o.starts_at,o.ends_at,o.buy_quantity,o.free_quantity FROM commerce.product p
        LEFT JOIN commerce.product_offer o ON o.product_id=p.id AND o.price_version=p.price_version
        AND o.starts_at<=:at AND o.ends_at>:at"""
    fun readProduct(rs: ResultSet): ProductView {
        val base = rs.getLong("price_minor")
        val kind = rs.getString("offer_kind")
        val discount = if (kind == null) 0 else PricingRules.discount(base, 1, offerFrom(rs))
        return ProductView(rs.getString("id"),rs.getString("name"),rs.getString("sku"),base-discount,rs.getBoolean("active") && rs.getInt("stock")>0,
            rs.getString("public_slug"),rs.getString("description"),rs.getString("image_path"),rs.getString("category_id"),base,discount,rs.getString("offer_title"),rs.getLong("price_version"),
            offerSummary=offerFrom(rs)?.let { PricingRules.summary(it) })
    }
    private fun offerFrom(rs: ResultSet): OfferInput? = rs.getString("offer_kind")?.let {
        OfferInput(rs.getString("offer_title"),OfferKind.valueOf(it),rs.getLong("offer_value"),
            rs.getTimestamp("starts_at").toInstant(),rs.getTimestamp("ends_at").toInstant(),rs.getInt("buy_quantity"),rs.getInt("free_quantity"))
    }
    fun lineDiscount(productId: String, quantity: Int, at: Instant): Long = jdbc.sql("$productSql WHERE p.id=:id")
        .param("id",productId).param("at",java.sql.Timestamp.from(at))
        .query { rs,_ -> PricingRules.discount(rs.getLong("price_minor"),quantity,offerFrom(rs)) }.single()
    fun categories(): List<CategoryView> = jdbc.sql("SELECT id,name,slug FROM commerce.category WHERE active=true ORDER BY sort_order,id")
        .query { rs,_ -> CategoryView(rs.getString("id"),rs.getString("name"),rs.getString("slug")) }.list()
    fun refreshAfter(at: Instant): Long {
        val next = jdbc.sql("""SELECT min(boundary) FROM commerce.product_offer o JOIN commerce.product p
            ON p.id=o.product_id AND p.price_version=o.price_version AND p.active=true
            CROSS JOIN LATERAL (VALUES(o.starts_at),(o.ends_at)) times(boundary) WHERE boundary>:at""")
            .param("at",java.sql.Timestamp.from(at)).query { rs,_ -> rs.getTimestamp(1)?.toInstant() }.list().firstOrNull()
        return if(next==null) 15000 else Duration.between(at,next).toMillis().coerceIn(1000,15000)
    }
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    fun products(page: Int=0, size: Int=24, category: String?=null, search: String?=null, sort: String="latest"): CatalogPage {
        require(page in 0..10000 && size in 1..100 && (category?.length ?: 0)<=100 && (search?.length ?: 0)<=120)
        require(sort in setOf("latest","price-asc","price-desc"))
        val at=databaseTime()
        // Only these constant ORDER BY expressions enter SQL. All customer-supplied values are bound.
        val effective = """(p.price_minor-CASE WHEN o.buy_quantity=1 AND o.kind='PERCENTAGE' THEN floor(p.price_minor::numeric*o.value/10000)::bigint
            WHEN o.buy_quantity=1 AND o.kind='FIXED_AMOUNT' THEN o.value ELSE 0 END)"""
        val order = when(sort) { "price-asc" -> "$effective ASC,p.id"; "price-desc" -> "$effective DESC,p.id"; else -> "p.created_at DESC,p.id DESC" }
        val rows=jdbc.sql("""$productSql WHERE p.active=true
            AND (:category='' OR p.category_id IN (SELECT id FROM commerce.category WHERE slug=:category AND active=true))
            AND (:search='' OR strpos(lower(p.name||' '||p.description),lower(:search))>0)
            ORDER BY $order LIMIT :limit OFFSET :offset""")
            .param("at",java.sql.Timestamp.from(at)).param("category",category ?: "").param("search",search ?: "")
            .param("limit",size+1).param("offset",page*size).query { rs,_ -> readProduct(rs) }.list()
        return CatalogPage(rows.take(size),page,rows.size>size,at,refreshAfter(at))
    }
    fun productAt(id: String, at: Instant, activeOnly: Boolean=true): ProductView = jdbc.sql("$productSql WHERE p.id=:id"+(if(activeOnly) " AND p.active=true" else ""))
        .param("id",id).param("at",java.sql.Timestamp.from(at)).query { rs,_ -> readProduct(rs) }.optional().orElseThrow { MissingResource() }
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    fun detail(slug: String): ProductDetailView {
        val at=databaseTime()
        val p=jdbc.sql("$productSql WHERE COALESCE(p.slug,p.id)=:slug AND p.active=true")
            .param("slug",slug).param("at",java.sql.Timestamp.from(at)).query { rs,_ -> readProduct(rs) }.optional().orElseThrow { MissingResource() }
        val siblings=jdbc.sql("""$productSql WHERE p.active=true AND p.family_id=(SELECT family_id FROM commerce.product WHERE id=:id) ORDER BY p.id LIMIT 100""")
            .param("id",p.id).param("at",java.sql.Timestamp.from(at)).query { rs,_ ->
                val variant=readProduct(rs);ProductVariantView(variant.id,variant.slug,rs.getString("variant_label").ifBlank { variant.name },variant.priceMinor,variant.available)
            }.list()
        val contents=jdbc.sql("SELECT c.component_product_id,p.name,c.quantity FROM commerce.product_bundle_component c JOIN commerce.product p ON p.id=c.component_product_id WHERE c.bundle_product_id=:id ORDER BY c.component_product_id")
            .param("id",p.id).query { rs,_ -> BundleComponentView(rs.getString(1),rs.getString(2),rs.getInt(3)) }.list()
        return ProductDetailView(p,at,refreshAfter(at),siblings,contents)
    }
    fun mayPrice(issuer: String, subject: String): Boolean = jdbc.sql("""SELECT count(*) FROM commerce.staff_permission
        WHERE issuer=:issuer AND subject=:subject AND permission='catalog.pricing.write'""")
        .param("issuer",issuer).param("subject",subject).query(Long::class.java).single()>0
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    fun configuration(productId: String): PricingConfiguration {
        val base=jdbc.sql("SELECT price_minor,price_version FROM commerce.product WHERE id=:id").param("id",productId)
            .query { rs,_ -> rs.getLong("price_minor") to rs.getLong("price_version") }.optional().orElseThrow { MissingResource() }
        val offers=jdbc.sql("""SELECT title,kind,value,starts_at,ends_at,buy_quantity,free_quantity FROM commerce.product_offer
            WHERE product_id=:id AND price_version=:version ORDER BY starts_at""")
            .param("id",productId).param("version",base.second).query { rs,_ ->
                OfferInput(rs.getString("title"),OfferKind.valueOf(rs.getString("kind")),rs.getLong("value"),rs.getTimestamp("starts_at").toInstant(),
                    rs.getTimestamp("ends_at").toInstant(),rs.getInt("buy_quantity"),rs.getInt("free_quantity")) }.list()
        return PricingConfiguration(base.second,base.first,offers)
    }
    @Transactional
    fun updatePricing(productId: String, actor: String, input: PricingInput): ProductDetailView {
        PricingRules.validate(input)
        val previous=jdbc.sql("SELECT price_minor,price_version FROM commerce.product WHERE id=:id FOR UPDATE").param("id",productId)
            .query { rs,_ -> rs.getLong("price_minor") to rs.getLong("price_version") }.optional().orElseThrow { StateConflict() }
        if(previous.second!=input.version) throw StateConflict()
        val updated=jdbc.sql("""UPDATE commerce.product SET price_minor=:price,price_version=price_version+1
            WHERE id=:id AND price_version=:version RETURNING price_version""")
            .param("price",input.basePriceMinor).param("id",productId).param("version",input.version)
            .query(Long::class.java).optional().orElseThrow { StateConflict() }
        input.offers.forEach { offer -> jdbc.sql("""INSERT INTO commerce.product_offer(id,product_id,price_version,title,kind,value,starts_at,ends_at,buy_quantity,free_quantity)
            VALUES(:id,:product,:version,:title,:kind,:value,:start,:end,:buy,:free)""")
            .param("id",UUID.randomUUID().toString()).param("product",productId).param("version",updated)
            .param("title",offer.title).param("kind",offer.kind.name).param("value",offer.value)
            .param("start",java.sql.Timestamp.from(offer.startsAt)).param("end",java.sql.Timestamp.from(offer.endsAt))
            .param("buy",offer.buyQuantity).param("free",offer.freeQuantity).update() }
        jdbc.sql("""INSERT INTO commerce.pricing_audit(id,product_id,actor_id,price_version,reason,snapshot)
            VALUES(:id,:product,:actor,:version,:reason,CAST(:snapshot AS jsonb))""")
            .param("id",UUID.randomUUID().toString()).param("product",productId).param("actor",actor)
            .param("version",updated).param("reason",input.reason).param("snapshot",mapper.writeValueAsString(mapOf("previousBasePriceMinor" to previous.first,"change" to input))).update()
        val at=databaseTime()
        return ProductDetailView(productAt(productId,at,false),at,refreshAfter(at))
    }
}
