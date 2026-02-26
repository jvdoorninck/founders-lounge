"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  LOOKING_FOR_OPTIONS,
  OFFERING_OPTIONS,
  PHASE_OPTIONS,
  INDUSTRY_TRACK_OPTIONS,
} from "@/lib/constants";

export default function RegisterPage() {
  const [isFounder, setIsFounder] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [offering, setOffering] = useState<string[]>([]);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyPhase, setCompanyPhase] = useState("");
  const [industryTrack, setIndustryTrack] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [eventSlots, setEventSlots] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/slots")
      .then((r) => r.json())
      .then((data) => setEventSlots(data.slots))
      .catch(() => {});
  }, []);

  function toggleItem(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (lookingFor.length === 0) {
      setError("Please select at least one thing you're looking for.");
      return;
    }
    if (offering.length === 0) {
      setError("Please select at least one thing you have to offer.");
      return;
    }
    if (availableSlots.length === 0) {
      setError("Please select at least one time slot.");
      return;
    }
    if (!companyPhase) {
      setError("Please select your company phase.");
      return;
    }
    if (industryTrack.length === 0) {
      setError("Please select an industry track.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          lookingFor,
          offering,
         companyWebsite: companyWebsite
  ? companyWebsite.startsWith("http://") || companyWebsite.startsWith("https://")
    ? companyWebsite
    : "https://" + companyWebsite
  : "",
          companyPhase,
          availableSlots,
          industryTrack,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">&#127881;</div>
          <h1 className="font-serif text-3xl mb-3">You&apos;re in!</h1>
          <p className="text-[var(--color-plum-light)] text-lg">
            We&apos;ll text you when we find a great match. Feel free to keep roaming the festival!
          </p>
          <p className="text-sm text-[var(--color-plum-light)] mt-6 opacity-60">
            powered by <span className="font-bold">breeze</span>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <div className="max-w-lg mx-auto px-5 pt-10">
        {/* Breeze logo */}
        <div className="mb-6">
          <Image
            src="/breeze-logo.svg"
            alt="breeze"
            width={180}
            height={44}
            priority
          />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl leading-tight">Founder to Founder</h1>
          <p className="text-[var(--color-plum-light)] mt-2">
            Meet fellow founders for 1:1 conversations at Upstream.
          </p>
          <p className="text-sm text-[var(--color-plum-light)] mt-1">
            Powered by <span className="font-bold">Breeze</span>
          </p>
        </div>

        {/* Founder check */}
        <fieldset className="mb-6">
          <legend className="font-semibold mb-3">
            Are you currently running your own company?
          </legend>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsFounder(true)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isFounder === true
                  ? "bg-[var(--color-plum)] text-white"
                  : "bg-white/60 text-[var(--color-plum)] hover:bg-white"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setIsFounder(false)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isFounder === false
                  ? "bg-[var(--color-plum)] text-white"
                  : "bg-white/60 text-[var(--color-plum)] hover:bg-white"
              }`}
            >
              No
            </button>
          </div>
        </fieldset>

        {isFounder === false && (
          <div className="bg-white/50 border border-[var(--color-peach)] rounded-2xl p-5 text-center">
            <p className="text-[var(--color-plum-light)]">
              This is for active founders — but enjoy the rest of Upstream! &#128075;
            </p>
          </div>
        )}

        {isFounder === true && (
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block font-semibold mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/70 border border-[var(--color-peach)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-plum)] focus:border-transparent placeholder:text-[var(--color-peach-dark)]"
                placeholder="Your name"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block font-semibold mb-1">
                Phone number
              </label>
              <p className="text-sm text-[var(--color-plum-light)] mb-1">
                We&apos;ll text you when we find a match.
              </p>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white/70 border border-[var(--color-peach)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-plum)] focus:border-transparent placeholder:text-[var(--color-peach-dark)]"
                placeholder="+31 6 1234 5678"
              />
            </div>

            {/* Looking for */}
            <fieldset>
              <legend className="font-semibold mb-2">
                What are you looking for?
              </legend>
              <div className="space-y-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <label key={option} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(option)}
                      onChange={() => toggleItem(lookingFor, option, setLookingFor)}
                      className="w-4 h-4 mt-0.5 accent-[var(--color-plum)] rounded"
                    />
                    <span className="text-[15px]">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Offering */}
            <fieldset>
              <legend className="font-semibold mb-2">
                What do you have to offer?
              </legend>
              <div className="space-y-2">
                {OFFERING_OPTIONS.map((option) => (
                  <label key={option} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offering.includes(option)}
                      onChange={() => toggleItem(offering, option, setOffering)}
                      className="w-4 h-4 mt-0.5 accent-[var(--color-plum)] rounded"
                    />
                    <span className="text-[15px]">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Company website — optional */}
            <div>
              <label htmlFor="website" className="block font-semibold mb-1">
                Company website <span className="text-sm font-normal text-[var(--color-plum-light)]">(optional)</span>
              </label>
              <input
                id="website"
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="w-full bg-white/70 border border-[var(--color-peach)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-plum)] focus:border-transparent placeholder:text-[var(--color-peach-dark)]"
                placeholder="https://yourcompany.com"
              />
            </div>

            {/* Company phase — tappable pills */}
            <fieldset>
              <legend className="font-semibold mb-2">
                Company phase
              </legend>
              <div className="flex flex-wrap gap-2">
                {PHASE_OPTIONS.map((phase) => (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setCompanyPhase(phase)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      companyPhase === phase
                        ? "bg-[var(--color-plum)] text-white"
                        : "bg-white/60 text-[var(--color-plum)] hover:bg-white"
                    }`}
                  >
                    {phase}
                  </button>
                ))}
              </div>
            </fieldset>

{/* Industry track — tappable pills */}
<fieldset>
  <legend className="font-semibold mb-2">
    Industry track
  </legend>
  <div className="flex flex-wrap gap-2">
    {INDUSTRY_TRACK_OPTIONS.map((track) => (
      <button
        key={track}
        type="button"
        onClick={() => toggleItem(industryTrack, track, setIndustryTrack)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          industryTrack.includes(track)
            ? "bg-[var(--color-plum)] text-white"
            : "bg-white/60 text-[var(--color-plum)] hover:bg-white"
        }`}
      >
        {track}
      </button>
    ))}
  </div>
</fieldset>
            
            {/* Time slots */}
            <fieldset>
              <legend className="font-semibold mb-2">
                What times would you be available approximately?
              </legend>
              <div className="flex flex-wrap gap-2">
                {eventSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleItem(availableSlots, slot, setAvailableSlots)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      availableSlots.includes(slot)
                        ? "bg-[var(--color-plum)] text-white"
                        : "bg-white/60 text-[var(--color-plum)] hover:bg-white"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <p className="text-sm text-[var(--color-plum-light)] mt-2 opacity-70">
                We&apos;ll notify you by SMS if we have a match. Feel free to keep roaming — no need to block these slots.
              </p>
            </fieldset>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--color-plum)] hover:bg-[var(--color-primary-dark)] text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Signing you up..." : "Sign me up"}
            </button>

            <p className="text-center text-sm text-[var(--color-plum-light)]">
              Powered by <span className="font-bold">Breeze</span>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
