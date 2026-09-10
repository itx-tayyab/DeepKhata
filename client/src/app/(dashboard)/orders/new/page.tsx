"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Tag,
  CheckCircle2,
  Wallet,
  Receipt,
  Barcode,
  PackageOpen,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  category?: { name: string };
};

type CartItem = Product & { qty: number };

function CreateOrderPOSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. API STATES
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<string[]>(["All"]);

  // 2. POS STATES
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerMode, setCustomerMode] = useState<"walk-in" | "existing">(
    "walk-in",
  );

  // 3. NEW CUSTOMER SEARCH STATES
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // 4. DISCOUNT & PAYMENT STATES
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderStatus, setOrderStatus] = useState("FINAL");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // 🟢 FETCH REAL CATEGORIES
  // ==========================================
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch("http://localhost:5000/product/getcategories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const names = data.categories.map((c: any) => c.name);
          setCategories(["All", ...names]);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  // ==========================================
  // 🟢 FETCH REAL PRODUCTS
  // ==========================================
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const token = localStorage.getItem("accessToken");
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);
        if (activeCategory !== "All") params.append("category", activeCategory);

        const res = await fetch(
          `http://localhost:5000/product/getproducts?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();

        if (data.success) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error("Failed to fetch products", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    const delayDebounceFn = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeCategory]);

  // ==========================================
  // 🟢 FETCH CUSTOMERS FOR SEARCH DROPDOWN
  // ==========================================
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingCustomer(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `http://localhost:5000/customer/getallcustomers?search=${customerSearch}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.success) {
          setCustomerResults(data.customers);
        }
      } catch (error) {
        console.error("Failed to search customers", error);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch]);

  // ==========================================
  // 🟢 AUTO-LOAD CUSTOMER FROM URL
  // ==========================================
  useEffect(() => {
    const urlCustomerId = searchParams.get("customerId");
    if (urlCustomerId) {
      setCustomerMode("existing");
      const token = localStorage.getItem("accessToken");

      fetch(`http://localhost:5000/customer/${urlCustomerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setSelectedCustomer(data.customer);
        })
        .catch((err) => console.error(err));
    }
  }, [searchParams]);

  // ==========================================
  // SUBMIT THE ORDER
  // ==========================================
  const handleCompleteOrder = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");

      const payload = {
        customerId: customerMode === "walk-in" ? null : selectedCustomer?.id,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.qty,
          price: item.price,
        })),
        discount: Number(discount),
        amountPaid: Number(amountPaid),
        paymentMethod,
        orderStatus,
      };

      const res = await fetch("http://localhost:5000/order/neworder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create order");

      alert("Order Successful!");
      router.push(`/orders/${data.order.id}`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cart Functions
  const addToCart = (product: Product) => {
    if (product.stock === 0) return alert("Out of stock!");
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        if (exists.qty >= product.stock) {
          alert("Cannot exceed available stock!");
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      }),
    );
  };

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const grandTotal = subtotal - (Number(discount) || 0);
  const pendingAmount = grandTotal - (Number(amountPaid) || 0);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden animate-in fade-in duration-500 mt-2">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-lg border border-slate-200 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Order</h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Point of Sale (POS)
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden mt-5 gap-6">
        {/* LEFT SIDE: CATALOG */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or scan barcode..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              />
              <Barcode className="h-4 w-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <div className="px-4 pt-3 pb-2 flex items-center gap-2 overflow-x-auto hide-scrollbar border-b border-slate-100 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {isLoadingProducts ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading products...
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className={`flex flex-col text-left bg-white p-4 rounded-xl border transition-all active:scale-95 shadow-sm relative overflow-hidden ${product.stock === 0 ? "border-slate-200 opacity-60 cursor-not-allowed" : "border-slate-200 hover:border-blue-500 hover:shadow-md"}`}
                  >
                    <span className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">
                      {product.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 mb-3 flex items-center gap-1">
                      <Barcode className="w-3 h-3" /> {product.sku || "N/A"}
                    </span>
                    <div className="mt-auto flex items-end justify-between w-full">
                      <span className="text-blue-600 font-black text-sm">
                        Rs. {product.price.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock > 5 ? "bg-emerald-50 text-emerald-600" : product.stock > 0 ? "bg-yellow-50 text-yellow-600" : "bg-rose-50 text-rose-600"}`}
                      >
                        {product.stock === 0
                          ? "Out of stock"
                          : `${product.stock} left`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: CART */}
        <div className="w-full lg:w-105 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0 h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button
                onClick={() => {
                  setCustomerMode("walk-in");
                  setSelectedCustomer(null);
                  setOrderStatus("COMPLETED"); // 🟢 FIX: Force status back to Completed
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${customerMode === "walk-in" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
              >
                Walk-in Customer
              </button>
              <button
                onClick={() => setCustomerMode("existing")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${customerMode === "existing" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
              >
                Existing / Search
              </button>
            </div>

            {/* REAL CUSTOMER SEARCH UI */}
            {customerMode === "existing" && (
              <div className="mt-3 relative">
                {!selectedCustomer ? (
                  <>
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer by name or phone..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                    />

                    {customerSearch.length >= 2 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {isSearchingCustomer ? (
                          <div className="p-3 text-xs text-center text-slate-500 font-medium">
                            Searching...
                          </div>
                        ) : customerResults.length > 0 ? (
                          customerResults.map((cust) => (
                            <div
                              key={cust.id}
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setCustomerSearch("");
                              }}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                            >
                              <p className="text-sm font-bold text-slate-900">
                                {cust.name}
                              </p>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-xs font-medium text-slate-500">
                                  {cust.phone}
                                </p>
                                {cust.balance > 0 && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                    Owes Rs. {cust.balance.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-center text-slate-500">
                            No customers found.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-xs font-medium text-blue-700 mt-0.5">
                        {selectedCustomer.phone}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1.5 text-blue-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors shadow-sm border border-transparent hover:border-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Walk-in Udhaar Warning */}
            {customerMode === "walk-in" &&
              pendingAmount > 0 &&
              cart.length > 0 && (
                <div className="mt-3 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Walk-in customers must pay in full.
                </div>
              )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Receipt className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm"
                >
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Rs. {item.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="p-1 hover:bg-slate-200 rounded-l-lg"
                      >
                        <Minus className="w-4 h-4 text-slate-600" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-slate-900">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="p-1 hover:bg-slate-200 rounded-r-lg"
                      >
                        <Plus className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 space-y-4">
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Tag className="w-4 h-4 text-blue-600" /> Discount (Rs)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-24 text-right outline-none font-bold text-rose-600 bg-transparent placeholder-slate-300"
                placeholder="0"
              />
            </div>

            <div className="flex items-end justify-between">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">
                Grand Total
              </span>
              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                Rs. {grandTotal.toLocaleString()}
              </span>
            </div>

            <hr className="border-slate-200" />

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    Amount Received
                    {pendingAmount > 0 && cart.length > 0 && (
                      <button
                        onClick={() => setAmountPaid(grandTotal.toString())}
                        className="text-blue-600 hover:underline text-[10px]"
                      >
                        Pay in Full
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </select>
                </div>
              </div>

              {/* 🟢 NEW: CONDITIONAL ORDER STATUS DROPDOWN */}
              {customerMode === "existing" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Order Status
                  </label>
                  <div className="relative">
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className={`w-full pl-3 pr-8 py-2 border rounded-lg text-sm font-bold focus:ring-2 outline-none appearance-none cursor-pointer transition-colors ${
                        orderStatus === "FINAL"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-emerald-500"
                          : "bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500"
                      }`}
                    >
                      <option value="FINAL">
                        FINAL (Handed to customer, Posts to Ledger)
                      </option>
                      <option value="MEMO">
                        MEMO / AMANAT (Locks Physical Stock only)
                      </option>
                    </select>
                    <ChevronDown
                      className={`w-4 h-4 absolute right-2.5 top-2.5 pointer-events-none ${orderStatus === "FINAL" ? "text-emerald-500" : "text-amber-500"}`}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCompleteOrder}
              disabled={
                cart.length === 0 ||
                (customerMode === "walk-in" && pendingAmount > 0) ||
                isSubmitting
              }
              className="w-full py-4 mt-2 bg-slate-900 text-white rounded-xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting
                ? "Processing..."
                : orderStatus === "FINAL"
                  ? "Complete Order"
                  : "Save Pending Order"}
              {!isSubmitting && <CheckCircle2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateOrderPOS() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-slate-500">
          Loading POS...
        </div>
      }
    >
      <CreateOrderPOSContent />
    </Suspense>
  );
}
