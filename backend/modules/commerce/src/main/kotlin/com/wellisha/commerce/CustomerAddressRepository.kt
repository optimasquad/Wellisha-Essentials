package com.wellisha.commerce

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
class CustomerAddressRepository(private val jdbc: JdbcClient) {
    @Transactional
    fun resolve(issuer: String, subject: String): Customer {
        val id = UUID.randomUUID().toString()
        jdbc.sql("""INSERT INTO commerce.customer(id, issuer, subject) VALUES(:id,:issuer,:subject)
            ON CONFLICT(issuer,subject) DO NOTHING""")
            .param("id",id).param("issuer",issuer).param("subject",subject).update()
        return Customer(jdbc.sql("SELECT id FROM commerce.customer WHERE issuer=:issuer AND subject=:subject")
            .param("issuer",issuer).param("subject",subject).query(String::class.java).single())
    }
    fun addresses(customer: String): List<Address> = jdbc.sql("""
        SELECT * FROM commerce.address WHERE customer_id=:customer ORDER BY created_at DESC LIMIT 100""")
        .param("customer",customer).query { rs,_ ->
            Address(rs.getString("id"),rs.getString("name"),rs.getString("phone"),rs.getString("address_line"),
                rs.getString("city"),rs.getString("state"),rs.getString("pincode"),rs.getLong("version"))
        }.list()
    @Transactional
    fun createAddress(customer: String, input: AddressInput): Address {
        val id = UUID.randomUUID().toString()
        addressWrite("""INSERT INTO commerce.address(id,customer_id,name,phone,address_line,city,state,pincode)
            VALUES(:id,:customer,:name,:phone,:line,:city,:state,:pin)""", id,customer,input).update()
        return addresses(customer).first { it.id == id }
    }
    @Transactional
    fun updateAddress(customer: String, id: String, input: VersionedAddressInput): Address {
        val count = addressWrite("""UPDATE commerce.address SET name=:name,phone=:phone,address_line=:line,
            city=:city,state=:state,pincode=:pin,version=version+1
            WHERE id=:id AND customer_id=:customer AND version=:version""",id,customer,input.address)
            .param("version",input.version).update()
        if (count != 1) throw MissingResource()
        return addresses(customer).first { it.id == id }
    }
    fun deleteAddress(customer: String,id: String) {
        if(jdbc.sql("DELETE FROM commerce.address WHERE id=:id AND customer_id=:customer")
            .param("id",id).param("customer",customer).update()!=1) throw MissingResource()
    }
    private fun addressWrite(sql: String,id: String,customer: String,a: AddressInput) = jdbc.sql(sql)
        .param("id",id).param("customer",customer).param("name",a.name).param("phone",a.phone)
        .param("line",a.addressLine).param("city",a.city).param("state",a.state).param("pin",a.pincode)
}

