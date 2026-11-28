import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  X,
  ExternalLink
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview', path: '/dealer/dashboard', icon: LayoutDashboard },
  { name: 'Products', path: '/dealer/products', icon: Package },
  { name: 'Inventory', path: '/dealer/inventory', icon: Boxes },
  { name: 'Orders', path: '/dealer/orders', icon: ShoppingCart },
  { name: 'Analytics', path: '/dealer/analytics', icon: BarChart3 },
  { name: 'Store Settings', path: '/dealer/store-settings', icon: Settings },
  { name: 'Help & Support', path: '/dealer/help-support', icon: HelpCircle },
];

export default function DealerSidebar({ mobileOpen, onCloseMobile }) {
  const location = useLocation();

  const isItemActive = (path) => {
    if (path === '/dealer/dashboard') {
      return location.pathname === '/dealer/dashboard' || location.pathname === '/dealer/overview';
    }
    if (path === '/dealer/products') {
      return location.pathname.startsWith('/dealer/products');
    }
    if (path === '/dealer/orders') {
      return location.pathname.startsWith('/dealer/orders');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-[#012D1D]/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside 
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#C1C8C2]/60 z-50 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Header & Logo */}
          <div className="h-16 px-4 border-b border-[#C1C8C2]/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#012D1D] flex items-center justify-center text-white font-bold text-[16px] shadow-sm">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[17px] text-[#012D1D] tracking-tight leading-none">
                  GROVE
                </span>
                <span className="text-[10px] text-[#717973] uppercase tracking-wider font-semibold leading-tight mt-0.5">
                  Dealer Portal
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-[#AEEECB] text-[#0E5138] text-[10px] font-bold uppercase tracking-wider">
                B2B
              </span>
              {/* Close button on mobile */}
              <button 
                type="button" 
                onClick={onCloseMobile} 
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 md:hidden"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Nav Links */}
          <div className="px-4 pt-4 pb-2">
            <span className="text-[11px] text-[#717973] uppercase tracking-wider font-bold">
              Menu
            </span>
          </div>

          <nav className="px-2.5 flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item.path);
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#012D1D] text-white shadow-sm'
                      : 'text-[#414844] hover:bg-[#EDF6ED] hover:text-[#151D18]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-[#717973]'}`} />
                    <span>{item.name}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
