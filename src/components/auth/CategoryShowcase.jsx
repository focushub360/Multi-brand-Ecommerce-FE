import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sprout, 
  Smartphone, 
  Cog, 
  ShoppingBasket, 
  Shirt, 
  Layers 
} from 'lucide-react';
import { categoriesApi } from '../../services/apiClient';

const FALLBACK_CATEGORY_IMAGES = {
  agriculture: '/images/hero-farmer.jpg',
  automotive: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
  electronics: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
  groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
  fashion: 'https://plus.unsplash.com/premium_photo-1683121263622-664434494177?w=1200&auto=format&fit=crop&q=80'
};

const SECONDARY_FALLBACKS = {
  agriculture: '/images/card-agri.png',
  automotive: '/images/card-automotive.png',
  electronics: '/images/card-electronics.png',
  groceries: '/images/card-groceries.png',
  fashion: 'https://plus.unsplash.com/premium_photo-1683121263622-664434494177?w=1200&auto=format&fit=crop&q=80'
};

const CATEGORY_THEMES = {
  agriculture: {
    accent: '#8BCB45',
    accentText: 'text-[#8BCB45]',
    bgGlow: '#8BCB45'
  },
  electronics: {
    accent: '#38BDF8',
    accentText: 'text-[#38BDF8]',
    bgGlow: '#38BDF8'
  },
  automotive: {
    accent: '#FF4D4D',
    accentText: 'text-[#FF4D4D]',
    bgGlow: '#FF4D4D'
  },
  groceries: {
    accent: '#F59E0B',
    accentText: 'text-[#F59E0B]',
    bgGlow: '#F59E0B'
  },
  fashion: {
    accent: '#E879F9',
    accentText: 'text-[#E879F9]',
    bgGlow: '#E879F9'
  }
};

const DEFAULT_CATEGORIES = [
  {
    _id: 'cat_agri',
    name: 'Agriculture & Farming',
    slug: 'agriculture',
    description: 'Machinery, irrigation, tillage equipment, seeds, and agronomy solutions.',
    image: '/images/hero-farmer.jpg',
    status: 'Active',
    subcategories: ['Tractors & Machinery', 'Seeds & Fertilizers', 'Irrigation Systems']
  },
  {
    _id: 'cat_auto',
    name: 'Automotive & Spare Parts',
    slug: 'automotive',
    description: 'OEM parts, heavy vehicle braking, lubricants, and commercial fleet spares.',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
    status: 'Active',
    subcategories: ['Brake Systems', 'Tires & Wheels', 'Engine Spares']
  },
  {
    _id: 'cat_elect',
    name: 'Electronics & Gadgets',
    slug: 'electronics',
    description: 'Field electronics, smart wearables, diagnostic tools, and tech essentials.',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    status: 'Active',
    subcategories: ['Laptops & Computers', 'Audio & Headphones', 'Smart Wearables']
  },
  {
    _id: 'cat_groc',
    name: 'Groceries & Essentials',
    slug: 'groceries',
    description: 'Daily pantry essentials, fresh produce, bulk wholesale provisions, and staples.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
    status: 'Active',
    subcategories: ['Daily Staples', 'Fresh Produce', 'Wholesale Packs']
  },
  {
    _id: 'cat_fash',
    name: 'Fashion & Apparel',
    slug: 'fashion',
    description: 'Protective workwear, casual apparel, footwear, and seasonal collections.',
    image: 'https://plus.unsplash.com/premium_photo-1683121263622-664434494177?w=1200&auto=format&fit=crop&q=80',
    status: 'Active',
    subcategories: ['Workwear', 'Footwear', 'Apparel']
  }
];

export default function CategoryShowcase({ isMobile = false }) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  // Sync with live categories from database
  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.getAll();
        if (!isMounted) return;

        const categoryList = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.categories)
              ? response.data.categories
              : Array.isArray(response?.categories)
                ? response.categories
                : [];

        if (categoryList.length > 0) {
          const activeList = categoryList
            .filter((cat) => !cat.status || cat.status.toLowerCase() === 'active')
            .map((cat) => ({
              ...cat,
              _id: String(cat._id || cat.id || cat.slug),
              slug: (cat.slug || '').toLowerCase(),
              image: cat.image || (Array.isArray(cat.images) && cat.images[0]) || ''
            }));

          if (activeList.length > 0) {
            setCategories(activeList);
          }
        }
      } catch (err) {
        console.warn('CategoryShowcase: Using fallback initial categories:', err.message);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Keep index valid
  useEffect(() => {
    setActiveIndex((prev) => (categories.length > 0 ? prev % categories.length : 0));
  }, [categories.length]);

  // Carousel rotation
  useEffect(() => {
    if (isPaused || categories.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % categories.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, categories.length]);

  const getCategoryIcon = (slug) => {
    const s = (slug || '').toLowerCase();
    if (s.includes('agri')) return Sprout;
    if (s.includes('elect')) return Smartphone;
    if (s.includes('auto')) return Cog;
    if (s.includes('groc')) return ShoppingBasket;
    if (s.includes('fash')) return Shirt;
    return Layers;
  };

  const getCategoryTheme = (slug) => {
    const s = (slug || '').toLowerCase();
    for (const key of Object.keys(CATEGORY_THEMES)) {
      if (s.includes(key)) return CATEGORY_THEMES[key];
    }
    return {
      accent: '#52B788',
      accentText: 'text-[#52B788]',
      bgGlow: '#52B788'
    };
  };

  const getImageSrc = (cat) => {
    const categoryId = cat._id || cat.id;
    const slug = (cat.slug || '').toLowerCase();

    if (imgErrors[categoryId]) {
      return SECONDARY_FALLBACKS[slug] || '/images/hero-farmer.jpg';
    }

    if (cat.image && typeof cat.image === 'string' && cat.image.trim() !== '') {
      return cat.image;
    }

    return FALLBACK_CATEGORY_IMAGES[slug] || SECONDARY_FALLBACKS[slug] || '/images/hero-farmer.jpg';
  };

  const handleImageError = (id) => {
    setImgErrors((prev) => ({
      ...prev,
      [id]: true
    }));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % categories.length);
  };

  const activeCategory = categories[activeIndex] || categories[0];
  const activeSlug = (activeCategory?.slug || '').toLowerCase();
  const theme = getCategoryTheme(activeSlug);
  const IconComponent = getCategoryIcon(activeSlug);

  // MOBILE SHOWCASE (Full-bleed cover background image + high z-index text)
  if (isMobile) {
    return (
      <div
        className="w-full relative h-[150px] sm:h-[160px] rounded-[20px] overflow-hidden shadow-md select-none bg-[#012D1D] border border-white/10 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Full-bleed cover background images */}
        {categories.map((cat, idx) => {
          const isCurrent = idx === activeIndex;
          const categoryId = cat._id || cat.id || idx;
          const imageSrc = getImageSrc(cat);

          return (
            <div
              key={categoryId}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isCurrent ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              <img
                src={imageSrc}
                alt={cat.name}
                onError={() => handleImageError(categoryId)}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#012D1D]/95 via-[#012D1D]/75 to-transparent" />
            </div>
          );
        })}

        {/* Foreground Content (High Z-Index) */}
        <div className="relative z-20 flex flex-col justify-between h-full p-4 text-white">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 w-fit">
            <IconComponent className="w-3 h-3" style={{ color: theme.accent }} />
            <span>{activeCategory?.name}</span>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight line-clamp-1 drop-shadow-md">
              {activeCategory?.name}
            </h3>
            <p className="text-[11px] text-white/90 line-clamp-1 mt-0.5 drop-shadow-sm">
              {activeCategory?.description || 'Explore verified products and supplies.'}
            </p>
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {categories.map((c, idx) => (
              <button
                key={c._id || c.id || idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Go to ${c.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP SHOWCASE (Full-bleed cover background image + high z-index text)
  return (
    <div
      className="relative w-full h-full rounded-[24px] overflow-hidden select-none bg-[#012D1D] shadow-inner border border-white/10 group"

      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images Covering Full Card Space */}
      {categories.map((cat, idx) => {
        const isCurrent = idx === activeIndex;
        const categoryId = cat._id || cat.id || idx;
        const imageSrc = getImageSrc(cat);

        return (
          <div
            key={categoryId}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isCurrent ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
            }`}
          >
            {/* Image covers full card space */}
            <img
              src={imageSrc}
              alt={cat.name}
              onError={() => handleImageError(categoryId)}
             className="absolute inset-0 w-full h-full object-cover object-[center_20%] transform transition-transform duration-1000 scale-100 group-hover:scale-105"
            />

            {/* Gradient Overlay for Text Readability & Cinematic Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#012D1D] via-[#012D1D]/65 to-transparent" />

          </div>
        );
      })}

      {/* Foreground Content: Elevated on z-index (z-20) */}
     <div className="relative z-20 flex flex-col  h-full p-5 text-white">

        {/* Top Header Badge & Counter */}
        <div className="flex items-center justify-between -mt-2.5 -ml-1.5">
          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-md">
            <IconComponent className="w-3.5 h-3.5" style={{ color: theme.accent }} />
            <span>{activeCategory?.name} Showcase</span>
          </div>

          <div className="text-[11px] font-bold text-white/95 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 tracking-widest shadow-sm">
            {activeIndex + 1} / {categories.length}
          </div>
        </div>

        {/* Center / Body Content */}
        <div className="my-auto py-1 mb-4">
  <div className="inline-block p-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 shadow-xl mb-2">
    <IconComponent className="w-5 h-5 text-white" />
  </div>

          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/80 mb-2 drop-shadow-sm">
            GROVE Marketplace
          </div>

          <h2
  className="text-xl lg:text-2xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-md"
  style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
>
  {activeCategory?.name}
</h2>

<p className="mt-1.5 text-xs text-neutral-100/95 font-normal leading-relaxed line-clamp-2 max-w-md drop-shadow">


            {activeCategory?.description || 'Explore verified products and trusted dealer networks across India.'}
          </p>

          {/* Subcategories tags with glassmorphism */}
          {Array.isArray(activeCategory?.subcategories) && activeCategory.subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {activeCategory.subcategories.slice(0, 3).map((sub, i) => (
                <span
                  key={i}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/25 shadow-sm"
                >
                  {typeof sub === 'string' ? sub : sub.name}
                </span>
              ))}
              {activeCategory.subcategories.length > 3 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white/80 border border-white/20">
                  +{activeCategory.subcategories.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Bar: Dots and Next Button */}
        <div className="pt-4 border-t border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {categories.map((c, idx) => (
              <button
                key={c._id || c.id || idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Switch to ${c.name}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold transition-all border border-white/25 hover:translate-x-0.5 cursor-pointer shadow-sm"
          >
            <span>Next Category</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
