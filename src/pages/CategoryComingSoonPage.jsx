import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { categoriesApi, productsApi } from '../services/apiClient.js';
import {
  Sparkles,
  ArrowRight,
  Store,
  Layers,
  ChevronRight,
  Tag,
  CheckCircle2,
  Clock,
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
  Heart,
  Shirt,
  Sun
} from 'lucide-react';

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

export default function CategoryComingSoonPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(true);

    // Fetch all categories to locate this category by slug
    categoriesApi.getAll()
      .then(async (res) => {
        const raw = res?.data || res?.categories || (Array.isArray(res) ? res : []);
        const found = raw.find(
          (c) =>
            (c.slug || '').toLowerCase() === (slug || '').toLowerCase() ||
            (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === (slug || '').toLowerCase()
        );

        if (found) {
          setCategory(found);
          document.title = `${found.name} | GROVE Marketplace`;

          // Try fetching products for this category
          try {
            const prodsRes = await productsApi.getAll({ limit: 50 });
            const allProds = prodsRes?.products || prodsRes?.data?.products || prodsRes?.data || (Array.isArray(prodsRes) ? prodsRes : []);
            const matching = allProds.filter((p) => {
              const pCat = (p.categoryName || p.category || '').toLowerCase();
              const catName = (found.name || '').toLowerCase();
              return pCat.includes(catName) || catName.includes(pCat);
            });

            const normalized = matching.map((p) => ({
              id: p.id || p._id,
              dealerId: p.dealerCode || 'DEALER_001',
              name: p.name,
              category: p.categoryName || p.category || found.name,
              discount: `-${p.discount || 10}%`,
              rating: p.rating || 4.5,
              reviews: p.reviewCount || 35,
              price: `₹${Number(p.price).toLocaleString('en-IN')}`,
              originalPrice: `₹${Number(p.mrp || p.price).toLocaleString('en-IN')}`,
              image: p.image || found.image || '/images/prod-tractor.png'
            }));

            setProducts(normalized);
          } catch (pErr) {
            console.warn('Error fetching category products:', pErr.message);
          }
        } else {
          // If not found in API, format a fallback category object from slug
          const formattedTitle = (slug || 'Category')
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          setCategory({
            name: formattedTitle,
            slug,
            description: `Explore premium certified products and authorized sellers in ${formattedTitle}.`,
            icon: 'Layers',
            subcategories: []
          });
          document.title = `${formattedTitle} | GROVE Marketplace`;
        }
      })
      .catch((err) => {
        console.warn('Failed to load category details:', err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (subscriberEmail.trim()) {
      setEmailSubscribed(true);
      setSubscriberEmail('');
    }
  };

  const renderIcon = (iconName) => {
    const raw = String(iconName || '').toLowerCase().replace(/[^a-z]/g, '');
    const IconComp = ICON_MAP[raw] || Layers;
    return <IconComp className="w-5 h-5 sm:w-6 sm:h-6 text-[#AEEECB]" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF5] flex flex-col justify-between">
        <div className="relative z-50 border-b border-neutral-200/60 bg-white/95 shadow-2xs">
          <Navbar darkText={true} />
        </div>
        <div className="max-w-md mx-auto py-32 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#012D1D] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-neutral-700">Loading category showcase...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const catName = category?.name || 'Category';

  return (
    <div className="min-h-screen bg-[#F7F3EA] flex flex-col justify-between text-neutral-900 font-sans">
      <div className="relative z-50 border-b border-neutral-200/60 bg-white/95 shadow-2xs">
        <Navbar darkText={true} />
      </div>

      <main className="flex-1 pb-16">
        {/* Category Hero Banner */}
        <section className="bg-[#0A3325] text-white pt-8 pb-12 sm:pb-16 relative overflow-hidden">
          {/* Subtle background motif */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none flex items-center justify-end">
            {category?.image && (
              <img
                src={category.image}
                alt=""
                className="h-full object-cover blur-xs"
              />
            )}
          </div>

          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-white/60 mb-6">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white">Categories</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#AEEECB] font-bold">{catName}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B4332] border border-[#AEEECB]/30 text-[#AEEECB] text-xs font-bold mb-3.5">
                  <span className="w-7 h-7 rounded-full bg-[#012D1D] flex items-center justify-center shrink-0">
                    {renderIcon(category?.icon)}
                  </span>
                  <span>GROVE VERIFIED CATEGORY</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  {catName}
                </h1>

                <p className="text-sm sm:text-base text-white/80 mt-2.5 max-w-xl leading-relaxed">
                  {category?.description || `Explore top verified products, authorized distributors, and genuine equipment across ${catName}.`}
                </p>

                {/* Subcategories list */}
                {category?.subcategories?.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider mr-1">
                      Subcategories:
                    </span>
                    {category.subcategories.map((sub, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                      >
                        <Tag className="w-3 h-3 text-[#AEEECB]" />
                        <span>{typeof sub === 'string' ? sub : sub.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Seller Action Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl max-w-sm w-full shrink-0">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#AEEECB] text-[#012D1D] flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Sell in this Category</h4>
                    <p className="text-[11px] text-white/70">Connect with buyers across India</p>
                  </div>
                </div>
                <Link
                  to={`/become-a-dealer?category=${encodeURIComponent(catName)}`}
                  className="w-full mt-2.5 py-2.5 px-4 rounded-xl bg-[#8BCB45] hover:bg-[#7CB938] text-[#012D1D] font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <span>Register as Dealer</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Products or Coming Soon Showcase */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-10">
          {products.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-300">
                <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
                  Available Products in {catName}
                </h3>
                <span className="text-xs font-bold text-neutral-500">
                  {products.length} Products Listed
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ) : (
            /* Branded Coming Soon Showcase State */
            <div className="bg-white rounded-3xl border border-[#C1C8C2]/60 shadow-sm p-6 sm:p-10 md:p-14 text-center max-w-3xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#E8F5E9] text-[#0E5138] flex items-center justify-center mx-auto mb-4 border border-[#AEEECB]/50 shadow-inner">
                <Clock className="w-8 h-8 text-[#0E5138]" />
              </div>

              <span className="px-3 py-1 rounded-full bg-[#AEEECB] text-[#012D1D] text-xs font-extrabold uppercase tracking-wider inline-block mb-3">
                Catalog Launching Soon
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {catName} Products Are Coming Soon
              </h2>

              <p className="text-sm text-neutral-600 max-w-lg mx-auto mt-2.5 leading-relaxed">
                Our operations team is currently onboarding verified suppliers and authentic brands for <strong>{catName}</strong>. All products will be backed by GROVE verification and fast dispatch.
              </p>

              {/* Subcategories showcase */}
              {category?.subcategories?.length > 0 && (
                <div className="mt-6 p-4 rounded-2xl bg-[#F8FAF8] border border-neutral-200 inline-block text-left max-w-xl mx-auto w-full">
                  <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Planned Product Lines:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((sub, i) => (
                      <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border text-neutral-800">
                        • {typeof sub === 'string' ? sub : sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dealer Call to Action */}
              <div className="mt-8 pt-6 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={`/become-a-dealer?category=${encodeURIComponent(catName)}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#012D1D] hover:bg-[#1B4332] text-white text-xs font-extrabold transition-all inline-flex items-center justify-center gap-2 shadow-md"
                >
                  <Store className="w-4 h-4 text-[#AEEECB]" />
                  <span>Are you a {catName} seller? Register Now</span>
                </Link>

                <Link
                  to="/"
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F7F3EA] hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all inline-flex items-center justify-center"
                >
                  Explore Other Categories
                </Link>
              </div>

              {/* Notification input */}
              <div className="mt-8 max-w-md mx-auto pt-6 border-t border-neutral-100">
                <p className="text-xs font-semibold text-neutral-500 mb-2.5">
                  Want to be notified when products go live?
                </p>
                {emailSubscribed ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Thank you! We will notify you once products launch.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 h-10 px-3.5 rounded-xl bg-[#F8FAF8] border border-neutral-300 text-xs focus:outline-none focus:border-[#012D1D]"
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-xl bg-[#012D1D] text-white font-bold text-xs hover:bg-[#1B4332] shrink-0"
                    >
                      Notify Me
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
