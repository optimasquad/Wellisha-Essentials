import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DiscountPopup } from "@/components/discount-popup";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: "Wellisha Essentials - Premium Period Care Products",
  description: "Experience comfort with Wellisha's 100% cotton, rash-free sanitary pads. Trusted by thousands of women across India.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Wellisha Essentials - Premium Period Care Products",
    description: "Experience comfort with Wellisha's 100% cotton, rash-free sanitary pads.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header commerceEnabled={!!process.env.COMMERCE_API_URL} />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          {!process.env.COMMERCE_API_URL && <DiscountPopup />}
        </Providers>
      </body>
    </html>
  );
}
