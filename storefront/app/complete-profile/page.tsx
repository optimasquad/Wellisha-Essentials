"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { User, Phone, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (status === "loading") return;
      
      if (!session?.user) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.profileComplete) {
            // Profile already complete, redirect to home
            router.push("/");
            return;
          }
          // Pre-fill form with existing data
          if (data?.user) {
            const nameParts = (data.user.name ?? "").split(" ");
            setFormData({
              firstName: data.user.firstName ?? nameParts[0] ?? "",
              lastName: data.user.lastName ?? nameParts.slice(1).join(" ") ?? "",
              phone: data.user.phone ?? "",
            });
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkProfile();
  }, [session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e?.target?.name ?? ""]: e?.target?.value ?? "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.firstName || !formData.lastName) {
      toast.error("Please enter your first and last name");
      setIsLoading(false);
      return;
    }

    if (!formData.phone || formData.phone.length < 10) {
      toast.error("Please enter a valid phone number");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Failed to update profile");
        setIsLoading(false);
        return;
      }

      toast.success("Profile completed successfully!");
      
      // Update session to reflect new profile data
      await update({
        ...session,
        user: {
          ...session?.user,
          name: `${formData.firstName} ${formData.lastName}`,
          profileComplete: true,
        },
      });

      router.push("/");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF5F5] to-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B6B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F5] to-white flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[#FF6B6B]">
            Wellisha
          </Link>
          <div className="w-16 h-16 bg-[#FFF5F5] rounded-full flex items-center justify-center mx-auto mt-6">
            <CheckCircle size={32} className="text-[#FF6B6B]" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-4">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome! Just a few more details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="First name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:border-[#FF6B6B]"
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ll use this for order updates and delivery coordination.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#FF6B6B] text-white font-semibold rounded-lg hover:bg-[#E55A5A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              "Saving..."
            ) : (
              <>
                Complete Profile
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Signed in as {session?.user?.email}
        </p>
      </motion.div>
    </div>
  );
}
