"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { COUNTRIES } from "@/lib/countries";

const SHIPPING_FEE = 12;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  joinLoyalty: boolean;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  joinLoyalty: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = "That doesn't look like a valid email.";
  if (!form.streetAddress.trim()) errors.streetAddress = "Street address is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.postalCode.trim()) errors.postalCode = "Postal code is required.";
  if (!form.country) errors.country = "Please choose a country.";
  return errors;
}

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  if (items.length === 0 && !submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-navy-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-600 mb-6">Add something to your cart before checking out.</p>
        <Link
          href="/"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Keep shopping
        </Link>
      </div>
    );
  }

  const total = subtotal + SHIPPING_FEE;

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🚧</p>
        <h1 className="text-2xl font-bold text-navy-800 mb-2">Almost there</h1>
        <p className="text-gray-600 mb-1">
          Thanks, {form.firstName}. Your details are ready to send to payment.
        </p>
        <p className="text-gray-600 mb-6">
          Stripe checkout isn&rsquo;t wired up yet — that&rsquo;s next. Your order total will be{" "}
          <strong>{formatPrice(total)}</strong>, shipping to {form.city}, {form.country}.
        </p>
        <Link
          href="/cart"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Back to cart
        </Link>
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-sm ${
      hasError ? "border-red-400" : "border-sand-200 focus:border-navy-800"
    } outline-none transition-colors`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} noValidate className="md:col-span-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">First name</label>
              <input
                className={inputClass(Boolean(errors.firstName))}
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">Last name</label>
              <input
                className={inputClass(Boolean(errors.lastName))}
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
              />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">Email</label>
              <input
                type="email"
                className={inputClass(Boolean(errors.email))}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className={inputClass(false)}
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-800 mb-1">Street address</label>
            <input
              className={inputClass(Boolean(errors.streetAddress))}
              value={form.streetAddress}
              onChange={(e) => handleChange("streetAddress", e.target.value)}
            />
            {errors.streetAddress && <p className="text-xs text-red-500 mt-1">{errors.streetAddress}</p>}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">City</label>
              <input
                className={inputClass(Boolean(errors.city))}
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">
                Region / State <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className={inputClass(false)}
                value={form.region}
                onChange={(e) => handleChange("region", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-800 mb-1">Postal code</label>
              <input
                className={inputClass(Boolean(errors.postalCode))}
                value={form.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
              />
              {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-800 mb-1">Country</label>
            <select
              className={inputClass(Boolean(errors.country))}
              value={form.country}
              onChange={(e) => handleChange("country", e.target.value)}
            >
              <option value="">Select a country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.joinLoyalty}
              onChange={(e) => handleChange("joinLoyalty", e.target.checked)}
            />
            Join Rusti&rsquo;s loyalty list
          </label>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-bold text-lg bg-coral-500 hover:bg-coral-600 text-white transition-colors"
          >
            Continue to payment
          </button>
        </form>

        <aside className="bg-white rounded-2xl border border-sand-200 p-5 space-y-3 h-fit">
          <h2 className="font-bold text-navy-800">Order summary</h2>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={`${item.sku}-${item.size}-${item.color}`} className="flex justify-between gap-2">
                <span className="text-gray-600">
                  {item.name}
                  {item.size ? ` (${item.size})` : ""}
                  {item.color ? ` — ${item.color}` : ""} × {item.quantity}
                </span>
                <span className="font-medium text-navy-800 shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-sand-200 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>{formatPrice(SHIPPING_FEE)}</span>
            </div>
            <div className="flex justify-between font-bold text-navy-800 pt-1">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
