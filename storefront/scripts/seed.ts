import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("johndoe123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      name: "John Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", admin.email);

  // Create categories
  const periodCare = await prisma.category.upsert({
    where: { slug: "period-care" },
    update: {},
    create: {
      name: "Period Care",
      slug: "period-care",
      description: "Premium sanitary pads and period care products",
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.category.upsert({
    where: { slug: "hair-removal" },
    update: {},
    create: {
      name: "Hair Removal",
      slug: "hair-removal",
      description: "Gentle hair removal solutions",
      isActive: false,
      sortOrder: 2,
    },
  });

  await prisma.category.upsert({
    where: { slug: "intimate-wellness" },
    update: {},
    create: {
      name: "Intimate Wellness",
      slug: "intimate-wellness",
      description: "Intimate care and hygiene products",
      isActive: false,
      sortOrder: 3,
    },
  });

  await prisma.category.upsert({
    where: { slug: "skin-care" },
    update: {},
    create: {
      name: "Skin Care",
      slug: "skin-care",
      description: "Natural skin care products",
      isActive: false,
      sortOrder: 4,
    },
  });

  console.log("Created categories");

  // Delete existing products
  await prisma.cartItem.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});

  // Create products
  const products = [
    {
      name: "Wellisha Ultra Thin XL Pads",
      slug: "wellisha-ultra-thin-xl-pads",
      description:
        "Designed with gynaecologists for the modern woman who never slows down. Wellisha Ultra Thin XL Pads feature a clean, chemical-free design with soft cottony comfort that's gentle on your skin. Smart absorption technology provides leak-secure protection for worry-free movement all day. Dermatologically tested and thoughtfully shaped to follow the body's natural contours, reducing bunching and preventing leaks. No harsh chemicals. No synthetic additives. Just gentle protection you can trust.",
      shortDescription: "15 Ultra Thin Pads (280mm) + 2 Panty Liners",
      image: "/products/wellisha-xl.jpg",
      images: [
        "/products/wellisha-lifestyle-1.jpg",
        "/products/wellisha-lifestyle-2.jpg",
      ],
      categoryId: periodCare.id,
      isActive: true,
      isFeatured: true,
      variants: [
        {
          name: "XL - 1 Pack",
          sku: "WE-XL-1",
          price: 225,
          salePrice: 189,
          stock: 100,
          size: "XL (280mm)",
          contents: "15 Pads + 2 Panty Liners",
          isDefault: true,
        },
        {
          name: "XL - 3 Pack (Best Value)",
          sku: "WE-XL-3",
          price: 675,
          salePrice: 499,
          stock: 50,
          size: "XL (280mm)",
          contents: "45 Pads + 6 Panty Liners",
          isDefault: false,
        },
      ],
    },
    {
      name: "Wellisha Ultra Thin XXL Pads",
      slug: "wellisha-ultra-thin-xxl-pads",
      description:
        "One pad that works for long days, busy travel, or restful nights. At 320 mm, Wellisha Ultra Thin XXL Pads provide dependable coverage when you need it most. Ergonomically designed with gynaecologists, these pads follow your body's natural contours for improved comfort. Soft, dry, and breathable layering keeps you feeling fresh, so you can stay focused on life—not your pad. Dermatologically tested and gentle on sensitive skin. Stay dry and confident every day.",
      shortDescription: "12 Ultra Thin Pads (320mm) + 2 Panty Liners",
      image: "/products/wellisha-xxl.jpg",
      images: [
        "/products/wellisha-lifestyle-1.jpg",
        "/products/wellisha-lifestyle-3.jpg",
      ],
      categoryId: periodCare.id,
      isActive: true,
      isFeatured: true,
      variants: [
        {
          name: "XXL - 1 Pack",
          sku: "WE-XXL-1",
          price: 249,
          salePrice: 209,
          stock: 100,
          size: "XXL (320mm)",
          contents: "12 Pads + 2 Panty Liners",
          isDefault: true,
        },
        {
          name: "XXL - 3 Pack (Best Value)",
          sku: "WE-XXL-3",
          price: 747,
          salePrice: 549,
          stock: 50,
          size: "XXL (320mm)",
          contents: "36 Pads + 6 Panty Liners",
          isDefault: false,
        },
      ],
    },
    {
      name: "Wellisha Ultra Thin XXXL Overnight Pads",
      slug: "wellisha-ultra-thin-xxxl-overnight-pads",
      description:
        "Reliable protection that adapts to your pace—even while you sleep. Wellisha Ultra Thin XXXL Overnight Pads at 410mm offer maximum coverage with leak-secure design for worry-free nights. Thoughtfully shaped with gynaecologists, the ergonomic design follows your body's natural contours to prevent bunching and leaks. Clean, chemical-free care with soft cottony comfort that's gentle on your skin. Because safety and comfort should never be negotiable.",
      shortDescription: "10 Ultra Thin Overnight Pads (410mm) + 2 Panty Liners",
      image: "/products/wellisha-xxxl.jpg",
      images: [
        "/products/wellisha-lifestyle-2.jpg",
        "/products/wellisha-lifestyle-3.jpg",
      ],
      categoryId: periodCare.id,
      isActive: true,
      isFeatured: true,
      variants: [
        {
          name: "XXXL - 1 Pack",
          sku: "WE-XXXL-1",
          price: 299,
          salePrice: 249,
          stock: 100,
          size: "XXXL (410mm)",
          contents: "10 Overnight Pads + 2 Panty Liners",
          isDefault: true,
        },
        {
          name: "XXXL - 3 Pack (Best Value)",
          sku: "WE-XXXL-3",
          price: 897,
          salePrice: 649,
          stock: 50,
          size: "XXXL (410mm)",
          contents: "30 Overnight Pads + 6 Panty Liners",
          isDefault: false,
        },
      ],
    },
    {
      name: "Wellisha Curated Period Pack",
      slug: "wellisha-curated-period-pack",
      description:
        "Curated for your complete cycle—because every day of the month deserves care that feels like home. The Wellisha Curated Period Pack brings together XL pads for lighter days and XXL pads for heavier flow, plus panty liners for everyday freshness. Every pad is ergonomically designed with gynaecologists, dermatologically tested, and made with clean, chemical-free materials. Thoughtful layering for a soft, dry, and breathable feel. Just gentle protection you can trust, from day one to the last.",
      shortDescription: "8 XL + 6 XXL Pads + 2 Panty Liners (14 Total)",
      image: "/products/wellisha-curated.jpg",
      images: [
        "/products/wellisha-xl.jpg",
        "/products/wellisha-xxl.jpg",
        "/products/wellisha-lifestyle-1.jpg",
      ],
      categoryId: periodCare.id,
      isActive: true,
      isFeatured: true,
      variants: [
        {
          name: "Curated Pack - 1 Pack",
          sku: "WE-CURATED-1",
          price: 279,
          salePrice: 229,
          stock: 100,
          size: "Mixed (XL + XXL)",
          contents: "8 XL + 6 XXL + 2 Panty Liners",
          isDefault: true,
        },
        {
          name: "Curated Pack - 3 Pack (Best Value)",
          sku: "WE-CURATED-3",
          price: 837,
          salePrice: 599,
          stock: 50,
          size: "Mixed (XL + XXL)",
          contents: "24 XL + 18 XXL + 6 Panty Liners",
          isDefault: false,
        },
      ],
    },
  ];

  for (const productData of products) {
    const { variants, ...product } = productData;
    await prisma.product.create({
      data: {
        ...product,
        variants: {
          create: variants,
        },
      },
    });
  }

  console.log("Created products:", products.length);

  // Create discount codes
  await prisma.discountCode.upsert({
    where: { code: "WELCOME15" },
    update: {},
    create: {
      code: "WELCOME15",
      description: "15% off for new customers",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minOrderValue: 0,
      maxDiscount: 200,
      isActive: true,
    },
  });

  await prisma.discountCode.upsert({
    where: { code: "TRIPLE15" },
    update: {},
    create: {
      code: "TRIPLE15",
      description: "15% off on 3 or more products",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minOrderValue: 500,
      maxDiscount: 300,
      isActive: true,
    },
  });

  await prisma.discountCode.upsert({
    where: { code: "FLAT50" },
    update: {},
    create: {
      code: "FLAT50",
      description: "Flat ₹50 off on orders above ₹499",
      discountType: "FIXED",
      discountValue: 50,
      minOrderValue: 499,
      isActive: true,
    },
  });

  console.log("Created discount codes");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
