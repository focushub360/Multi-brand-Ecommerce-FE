import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Sprout,
  Smartphone,
  Cog,
  ShoppingBasket,
  Package,
  Wheat,
  Cpu,
  Car,
  Wrench,
  Shield,
  Zap,
  Sparkles,
  Heart,
  Shirt,
  Sun,
  Layers
} from 'lucide-react';
import { categoriesApi } from '../services/apiClient.js';

const ICON_MAP = {
  sprout: Sprout,
  smartphone: Smartphone,
  cog: Cog,
  shoppingbasket: ShoppingBasket,
  package: Package,
  wheat: Wheat,
  cpu: Cpu,
  car: Car,
  wrench: Wrench,
  shield: Shield,
  zap: Zap,
  sparkles: Sparkles,
  heart: Heart,
  shirt: Shirt,
  sun: Sun,
  layers: Layers
};

const KNOWN_METAS = {
  agriculture: {
    id: "agriculture",
    title: "AGRICULTURE",
    subtitle: "FARMING & EQUIPMENT",
    headingLine1: "Smart farming",
    headingLine2: "starts here.",
    cta: "Explore Agriculture",
    bgColor: "#EDF0D9",
    accentColor: "#0A3325",
    textColor: "#183B20",
    image: "/images/card-agri.png",
    iconBg: "#DCE3C2",
    iconColor: "#2C4A28",
    titleColor: "#0A3325",
    subtitleColor: "#5E7A5A",
    url: "/agriculture"
  },
  electronics: {
    id: "electronics",
    title: "ELECTRONICS",
    subtitle: "GADGETS & TECHNOLOGY",
    headingLine1: "Upgrade",
    headingLine2: "your everyday.",
    cta: "Explore Electronics",
    bgColor: "#F5F2EC",
    accentColor: "#171717",
    textColor: "#171717",
    image: "/images/card-electronics.png",
    iconBg: "#E8E2D6",
    iconColor: "#333333",
    titleColor: "#141414",
    subtitleColor: "#737373",
    url: "/electronics"
  },
  automotive: {
    id: "automotive",
    title: "AUTOMOTIVE",
    subtitle: "PARTS & ACCESSORIES",
    headingLine1: "Parts for",
    headingLine2: "every journey.",
    cta: "Explore Automotive",
    bgColor: "#F9E4E1",
    accentColor: "#FF383F",
    textColor: "#3D1412",
    image: "/images/card-automotive.png",
    iconBg: "#F2CDC7",
    iconColor: "#C23631",
    titleColor: "#A82420",
    subtitleColor: "#D6534E",
    url: "/automotive"
  },
  groceries: {
    id: "groceries",
    title: "GROCERIES",
    subtitle: "DAILY ESSENTIALS",
    headingLine1: "Fresh essentials",
    headingLine2: "for everyday needs.",
    cta: "Explore Groceries",
    bgColor: "#FEF3E2",
    accentColor: "#C26D00",
    textColor: "#78350F",
    image: "/images/card-groceries.png",
    iconBg: "#FDE68A",
    iconColor: "#B45309",
    titleColor: "#78350F",
    subtitleColor: "#B45309",
    url: "/groceries"
  }
};

const CARD_PALETTES = [
  { bgColor: "#EDF0D9", accentColor: "#0A3325", textColor: "#183B20", iconBg: "#DCE3C2", iconColor: "#2C4A28", titleColor: "#0A3325", subtitleColor: "#5E7A5A" },
  { bgColor: "#F5F2EC", accentColor: "#171717", textColor: "#171717", iconBg: "#E8E2D6", iconColor: "#333333", titleColor: "#141414", subtitleColor: "#737373" },
  { bgColor: "#F9E4E1", accentColor: "#FF383F", textColor: "#3D1412", iconBg: "#F2CDC7", iconColor: "#C23631", titleColor: "#A82420", subtitleColor: "#D6534E" },
  { bgColor: "#FEF3E2", accentColor: "#C26D00", textColor: "#78350F", iconBg: "#FDE68A", iconColor: "#B45309", titleColor: "#78350F", subtitleColor: "#B45309" },
  { bgColor: "#E6F4EA", accentColor: "#137333", textColor: "#0D5324", iconBg: "#CEEAD6", iconColor: "#137333", titleColor: "#0D5324", subtitleColor: "#188038" },
  { bgColor: "#EEF2FF", accentColor: "#4338CA", textColor: "#312E81", iconBg: "#E0E7FF", iconColor: "#4338CA", titleColor: "#312E81", subtitleColor: "#4F46E5" },
  { bgColor: "#FFF1F2", accentColor: "#BE123C", textColor: "#881337", iconBg: "#FFE4E6", iconColor: "#BE123C", titleColor: "#881337", subtitleColor: "#E11D48" },
  { bgColor: "#FAF5FF", accentColor: "#7E22CE", textColor: "#581C87", iconBg: "#F3E8FF", iconColor: "#7E22CE", titleColor: "#581C87", subtitleColor: "#9333EA" }
];

export default function CategoryCards() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(Object.values(KNOWN_METAS));

  useEffect(() => {
    let isMounted = true;

    categoriesApi.getAll()
      .then((res) => {
        if (!isMounted) return;
        const raw = res?.data || res?.categories || (Array.isArray(res) ? res : []);
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped = raw.map((cat, idx) => {
            const slug = (cat.slug || '').toLowerCase();
            const known = KNOWN_METAS[slug];

            // Subtitle from subcategories or default
            let subtitle = 'PREMIUM SELECTION';
            if (Array.isArray(cat.subcategories) && cat.subcategories.length > 0) {
              subtitle = cat.subcategories
                .slice(0, 2)
                .map((s) => (typeof s === 'string' ? s : s.name).toUpperCase())
                .join(' & ');
            } else if (known?.subtitle) {
              subtitle = known.subtitle;
            }

            // Heading lines from description or fallback
            let headingLine1 = known?.headingLine1 || 'Quality essentials';
            let headingLine2 = known?.headingLine2 || 'for everyday needs.';
            if (cat.description && cat.description.trim()) {
              const words = cat.description.trim().split(/\s+/);
              if (words.length > 3) {
                headingLine1 = words.slice(0, 2).join(' ');
                headingLine2 = words.slice(2, 6).join(' ') + (words.length > 6 ? '...' : '');
              } else {
                headingLine1 = cat.description.trim();
                headingLine2 = 'starts here.';
              }
            }

            const palette = known || CARD_PALETTES[idx % CARD_PALETTES.length];

            return {
              id: slug || String(cat._id || cat.id),
              rawCategory: cat,
              title: (cat.name || slug).toUpperCase(),
              subtitle,
              headingLine1,
              headingLine2,
              cta: `Explore ${cat.name || 'Category'}`,
              bgColor: palette.bgColor,
              accentColor: palette.accentColor,
              textColor: palette.textColor,
              titleColor: palette.titleColor,
              subtitleColor: palette.subtitleColor,
              iconBg: palette.iconBg,
              iconColor: palette.iconColor,
              image: cat.image || (Array.isArray(cat.images) && cat.images[0]) || palette.image || '/images/card-agri.png',
              iconName: cat.icon || (slug.includes('agri') ? 'Sprout' : slug.includes('elect') ? 'Smartphone' : slug.includes('auto') ? 'Cog' : slug.includes('groc') ? 'ShoppingBasket' : 'Layers'),
              url: known?.url || `/category/${slug}`
            };
          });

          setCategories(mapped);
        }
      })
      .catch((err) => {
        console.warn('Live categories fetch warning, keeping initial cards:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const renderIcon = (card) => {
    const rawName = String(card.iconName || card.id || '').toLowerCase().replace(/[^a-z]/g, '');
    const IconComp = ICON_MAP[rawName] || (card.id === 'agriculture' ? Sprout : card.id === 'electronics' ? Smartphone : card.id === 'automotive' ? Cog : card.id === 'groceries' ? ShoppingBasket : Layers);

    return <IconComp className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: card.iconColor }} />;
  };

  const handleCardClick = (url) => {
    navigate(url);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 w-full pointer-events-auto">
      {/* Responsive layout: 4 columns on desktop, 2 columns on tablet, 1 column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-3.5 xl:gap-4 w-full">
        {categories.map((card) => {
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.url)}
              className="w-full rounded-[22px] sm:rounded-[26px] lg:rounded-[24px] xl:rounded-[28px] overflow-hidden p-4 sm:p-5 lg:p-4.5 xl:p-6 relative h-[185px] sm:h-[205px] md:h-[220px] lg:h-[235px] xl:h-[248px] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.1)] transition-all duration-300 group select-none cursor-pointer hover:-translate-y-0.5"
              style={{ backgroundColor: card.bgColor }}
            >
              {/* Left Content Area: Badge, Title, Subtitle, Description */}
              <div className="relative z-10 max-w-[56%] sm:max-w-[54%] md:max-w-[52%] lg:max-w-[58%] xl:max-w-[54%] flex flex-col items-start">
                {/* Circular Icon Badge */}
                <div 
                  className="w-7 h-7 sm:w-7.5 sm:h-7.5 md:w-8 md:h-8 rounded-full flex items-center justify-center mb-2 sm:mb-2.5 md:mb-3 transition-transform group-hover:scale-105 duration-200 shrink-0"
                  style={{ backgroundColor: card.iconBg }}
                >
                  {renderIcon(card)}
                </div>

                {/* Title */}
                <h3 
                  className="text-[17px] sm:text-[18px] md:text-[19px] lg:text-[17.5px] xl:text-[20px] font-extrabold tracking-tight leading-none"
                  style={{ 
                    color: card.titleColor,
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
                  }}
                >
                  {card.title}
                </h3>
                
                {/* Subtitle */}
                <p 
                  className="text-[8.5px] sm:text-[9px] md:text-[9.5px] lg:text-[8.5px] xl:text-[9px] font-bold tracking-[0.12em] sm:tracking-[0.14em] uppercase mt-0.5 sm:mt-1 mb-1.5 sm:mb-2 line-clamp-1"
                  style={{ color: card.subtitleColor }}
                >
                  {card.subtitle}
                </p>

                {/* Description */}
                <p 
                  className="text-[11.5px] sm:text-[12px] md:text-[12.5px] lg:text-[11px] xl:text-[12px] font-bold leading-[1.25] text-neutral-800 line-clamp-2"
                >
                  {card.headingLine1}
                  <br />
                  {card.headingLine2}
                </p>
              </div>

              {/* Bottom CTA Button */}
              <div className="relative z-10 mt-2 sm:mt-3">
                <Link
                  to={card.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="inline-flex items-center gap-1.5 sm:gap-2 group/btn cursor-pointer select-none"
                >
                  <span 
                    className="w-6 h-6 sm:w-6.5 sm:h-6.5 lg:w-5.5 lg:h-5.5 xl:w-6.5 xl:h-6.5 rounded-full flex items-center justify-center text-white transition-transform duration-200 group-hover/btn:translate-x-0.5 shrink-0"
                    style={{ backgroundColor: card.accentColor }}
                  >
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
                  </span>
                  <span 
                    className="text-[11px] sm:text-[11.5px] md:text-[12px] lg:text-[10px] xl:text-[11.5px] font-bold tracking-tight transition-opacity hover:opacity-85 whitespace-nowrap"
                    style={{ color: card.titleColor }}
                  >
                    {card.cta}
                  </span>
                </Link>
              </div>

              {/* Right Product Imagery with seamless left alpha gradient mask */}
              <div 
                className="absolute right-0 bottom-0 top-0 w-[46%] sm:w-[48%] md:w-[50%] lg:w-[46%] xl:w-[50%] pointer-events-none flex items-end justify-end overflow-hidden"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 100%)',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 100%)',
                }}
              >
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-contain object-right-bottom group-hover:scale-[1.02] transition-transform duration-300"
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.05))' }}
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/images/card-agri.png';
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
