"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { ShoppingCart, Search, Menu, X, User, LogOut, Package, LayoutDashboard, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const shopCategories = [
  { name: "Period Care", emoji: "🩸", href: "/products?category=period-care", active: true },
  { name: "Hair Removal", emoji: "✨", href: "#", active: false, comingSoon: true },
  { name: "Intimate Wellness", emoji: "🌸", href: "#", active: false, comingSoon: true },
  { name: "Skin Care", emoji: "💆", href: "#", active: false, comingSoon: true },
];

export function Header() {
  const { data: session, status } = useSession() || {};
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCartCount();
    }
  }, [session?.user?.id]);

  const fetchCartCount = async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const count = data?.items?.reduce?.((acc: number, item: { quantity: number }) => acc + (item?.quantity ?? 0), 0) ?? 0;
        setCartCount(count);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery?.trim?.()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-[#FF6B6B] text-white text-center py-2 px-4 text-sm font-medium">
        Use code <span className="font-bold">TRIPLE15</span> to avail <span className="font-bold">15% OFF</span> on 3 or more products
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left Navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              {/* Shop Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setShopDropdownOpen(true)}
                onMouseLeave={() => setShopDropdownOpen(false)}
              >
                <button
                  className="flex items-center text-gray-700 hover:text-[#FF6B6B] font-medium transition-colors"
                >
                  Shop
                  <ChevronDown size={16} className={`ml-1 transition-transform ${shopDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {shopDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full pt-2 w-56"
                    >
                      <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2 overflow-hidden">
                        {shopCategories.map((category, index) => (
                          <Link
                            key={index}
                            href={category.active ? category.href : "#"}
                            className={`flex items-center px-4 py-3 transition-colors ${
                              category.active 
                                ? "hover:bg-[#FFF5F5] text-gray-700 hover:text-[#FF6B6B]" 
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                            onClick={(e) => !category.active && e.preventDefault()}
                          >
                            <span className="text-lg mr-3">{category.emoji}</span>
                            <span className="font-medium">{category.name}</span>
                            {category.comingSoon && (
                              <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                Soon
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <Link
                href="/blog"
                className="flex items-center text-gray-700 hover:text-[#FF6B6B] font-medium transition-colors"
              >
                <span className="text-pink-500 mr-1">💕</span>
                Blog
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo - Centered */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 lg:mx-auto">
              <span className="text-2xl font-bold tracking-wide text-gray-900">WELLISHA</span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-700 hover:text-[#FF6B6B] transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* User Menu */}
              {!mounted || status === "loading" ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : session?.user ? (
                <div className="relative group">
                  <button className="p-2 text-gray-700 hover:text-[#FF6B6B] transition-colors">
                    <User size={20} />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-gray-900 truncate">
                        {session?.user?.name ?? "User"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {session?.user?.email ?? ""}
                      </p>
                    </div>
                    <Link
                      href="/account/orders"
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <Package size={16} className="mr-2" />
                      My Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        <LayoutDashboard size={16} className="mr-2" />
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2 text-gray-700 hover:text-[#FF6B6B] transition-colors"
                >
                  <User size={20} />
                </Link>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 text-gray-700 hover:text-[#FF6B6B] transition-colors"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF6B6B] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pb-4"
              >
                <form onSubmit={handleSearch} className="flex">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e?.target?.value ?? "")}
                    placeholder="Search for products..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:border-[#FF6B6B]"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#FF6B6B] text-white rounded-r-full hover:bg-[#E55A5A] transition-colors"
                  >
                    Search
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white border-t overflow-hidden"
            >
              <nav className="flex flex-col py-4 px-4">
                <div className="py-3 border-b">
                  <p className="font-semibold text-gray-900 mb-2">Shop</p>
                  {shopCategories.map((category, index) => (
                    <Link
                      key={index}
                      href={category.active ? category.href : "#"}
                      className={`flex items-center py-2 pl-4 ${
                        category.active 
                          ? "text-gray-700 hover:text-[#FF6B6B]" 
                          : "text-gray-400"
                      }`}
                      onClick={(e) => {
                        if (!category.active) e.preventDefault();
                        else setIsMenuOpen(false);
                      }}
                    >
                      <span className="mr-2">{category.emoji}</span>
                      {category.name}
                      {category.comingSoon && (
                        <span className="ml-2 text-xs text-gray-400">(Coming Soon)</span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/blog"
                  className="py-3 text-gray-700 hover:text-[#FF6B6B] font-medium border-b flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-pink-500 mr-2">💕</span>
                  Blog
                </Link>
                <Link
                  href="/about"
                  className="py-3 text-gray-700 hover:text-[#FF6B6B] font-medium border-b"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="py-3 text-gray-700 hover:text-[#FF6B6B] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
                {session?.user && isAdmin && (
                  <Link
                    href="/admin"
                    className="py-3 text-gray-700 hover:text-[#FF6B6B] font-medium border-t"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
