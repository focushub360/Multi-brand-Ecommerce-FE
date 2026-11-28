import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import BestSellers from '../components/BestSellers';
import CategoryCollectionSection from '../components/CategoryCollectionSection';
import PromoBanner from '../components/PromoBanner';
import TrustSection from '../components/TrustSection';
import BecomeDealerSection from '../components/BecomeDealerSection';
import NewsletterSection from '../components/NewsletterSection';
import Footer from '../components/Footer';
import { productsApi, categoriesApi } from '../services/apiClient.js';

const KNOWN_CONFIGS = {
  agriculture: {
    id: "agriculture",
    tag: "AGRICULTURE",
    title: "Agriculture Essentials",
    subtitle: "Reliable equipment for every farming need.",
    viewAllText: "View All Agriculture",
    viewAllHref: "/agriculture",
    accentColor: "#0A3325",
    tagColor: "#0A3325",
    tagBg: "#E4EBDC"
  },
  electronics: {
    id: "electronics",
    tag: "ELECTRONICS",
    title: "Electronics & Gadgets",
    subtitle: "Technology for work and everyday life.",
    viewAllText: "View All Electronics",
    viewAllHref: "/electronics",
    accentColor: "#171717",
    tagColor: "#171717",
    tagBg: "#EDE8DE"
  },
  automotive: {
    id: "automotive",
    tag: "AUTOMOTIVE",
    title: "Automotive & Spare Parts",
    subtitle: "Quality parts for every journey.",
    viewAllText: "View All Automotive",
    viewAllHref: "/automotive",
    accentColor: "#FF383F",
    tagColor: "#FF383F",
    tagBg: "#FDE2E1"
  },
  groceries: {
    id: "groceries",
    tag: "GROCERIES",
    title: "Fresh Groceries & Essentials",
    subtitle: "Daily essentials and fresh staples for everyday needs.",
    viewAllText: "View All Groceries",
    viewAllHref: "/groceries",
    accentColor: "#C26D00",
    tagColor: "#78350F",
    tagBg: "#FDE68A"
  }
};

const EXTRA_PALETTES = [
  { accentColor: "#137333", tagColor: "#0D5324", tagBg: "#CEEAD6" },
  { accentColor: "#4338CA", tagColor: "#312E81", tagBg: "#E0E7FF" },
  { accentColor: "#BE123C", tagColor: "#881337", tagBg: "#FFE4E6" },
  { accentColor: "#7E22CE", tagColor: "#581C87", tagBg: "#F3E8FF" }
];

export default function HomePage() {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    document.title = 'GROVE - Online Multi-Category Marketplace';
    let isMounted = true;

    Promise.allSettled([
      categoriesApi.getAll(),
      productsApi.getAll({ limit: 100 })
    ]).then(([catsResult, prodsResult]) => {
      if (!isMounted) return;

      const rawCats = catsResult.status === 'fulfilled'
        ? (catsResult.value?.data || catsResult.value?.categories || (Array.isArray(catsResult.value) ? catsResult.value : []))
        : [];

      const rawProds = prodsResult.status === 'fulfilled'
        ? (prodsResult.value?.products || prodsResult.value?.data?.products || prodsResult.value?.data || (Array.isArray(prodsResult.value) ? prodsResult.value : []))
        : [];

      const normalizeProd = (p) => ({
        id: p.sku?.toLowerCase() || p.slug || p.id || p._id,
        name: p.name,
        category: p.categoryName || p.category,
        price: `₹${Number(p.price).toLocaleString('en-IN')}`,
        originalPrice: `₹${Number(p.mrp || p.price).toLocaleString('en-IN')}`,
        discount: `-${p.discount || 10}%`,
        rating: p.rating || 4.5,
        reviews: p.reviewCount || 35,
        image: p.image || '/images/prod-tractor.png',
        dealerId: p.dealerCode || 'DEALER_001'
      });

      // If categories fetched from DB, build sections dynamically
      const activeCats = rawCats.length > 0 ? rawCats : [
        { name: 'Agriculture & Farming', slug: 'agriculture' },
        { name: 'Electronics & Gadgets', slug: 'electronics' },
        { name: 'Automotive & Spare Parts', slug: 'automotive' },
        { name: 'Groceries', slug: 'groceries' }
      ];

      const builtSections = activeCats.map((cat, idx) => {
        const slug = (cat.slug || '').toLowerCase();
        const known = KNOWN_CONFIGS[slug];
        const palette = known || EXTRA_PALETTES[idx % EXTRA_PALETTES.length];

        const catKeywords = (cat.name || '').toLowerCase().split(/[\s&,-]+/).filter((k) => k.length > 2);

        // Find products matching this category
        const matchingProds = rawProds
          .filter((p) => {
            const pCat = (p.categoryName || p.category || '').toLowerCase();
            const cName = (cat.name || '').toLowerCase();
            return pCat.includes(cName) || cName.includes(pCat) || catKeywords.some((kw) => pCat.includes(kw));
          })
          .slice(0, 5)
          .map(normalizeProd);

        return {
          id: slug || `cat-${idx}`,
          tag: (cat.name || slug).toUpperCase(),
          title: known?.title || `${cat.name} Collection`,
          subtitle: known?.subtitle || cat.description || `Explore top products in ${cat.name}.`,
          viewAllText: known?.viewAllText || `View All ${cat.name}`,
          viewAllHref: known?.viewAllHref || `/category/${slug}`,
          accentColor: palette.accentColor,
          tagColor: palette.tagColor,
          tagBg: palette.tagBg,
          products: matchingProds
        };
      });

      setSections(builtSections);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-neutral-900 overflow-x-hidden font-sans">
      {/* 1 & 2: Navbar, Hero, SearchBar, and Category Cards */}
      <Hero />

      {/* 3: Best Sellers Section (with Product Cards and Dynamic Filter Controls) */}
      <BestSellers />

      {/* 4+: Dynamic Category Collection Sections for all categories in DB */}
      {sections.map((sec) => (
        <CategoryCollectionSection key={sec.id} {...sec} />
      ))}

      {/* Promotional Offer Banner */}
      <PromoBanner />

      {/* Why Shop on GROVE? (Trust Section) */}
      <TrustSection />

      {/* Become a Dealer Section */}
      <BecomeDealerSection />

      {/* Newsletter Subscription Section */}
      <NewsletterSection />

      {/* Complete Footer */}
      <Footer />
    </main>
  );
}
