import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  MapPin,
  User,
  Zap,
  ChevronDown,
  Activity,
  ShieldCheck,
  Bike,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { apiClient } from '../api/client';
import { IProduct } from '@quickcommerce/shared-types';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenLocation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenLocation }) => {
  const { user, isAuthenticated, logout, loginDemo } = useAuth();
  const { itemCount, setIsDrawerOpen } = useCart();
  const { activeStore, deliveryLocation, deliveryMinutes } = useStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<IProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced Search Suggestions (300ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/products?search=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        setSuggestions(res.data.data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSuggestions([]);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Delivery Location */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-600/20 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6 fill-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-2xl tracking-tight text-neutral-900 flex items-center gap-1">
                  Quick<span className="text-brand-600">Commerce</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block w-fit">
                  ⚡ 10-Min Delivery
                </span>
              </div>
            </Link>

            {/* Location Selector */}
            <button
              onClick={onOpenLocation}
              className="hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 transition-colors text-left"
              title="Change Delivery Location"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-brand-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-neutral-900 leading-none">
                    Delivery in {deliveryMinutes} mins
                  </span>
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </div>
                <span className="text-[11px] text-neutral-500 truncate max-w-[140px] leading-tight">
                  {deliveryLocation}
                </span>
              </div>
            </button>
          </div>

          {/* Search Bar with Debounced Suggestions */}
          <div ref={searchRef} className="flex-1 max-w-xl relative hidden md:block">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder='Search for "fresh milk", "bread", "apples", "rice"...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-neutral-100/90 border border-transparent focus:border-brand-500 focus:bg-white rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200/90 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-neutral-100 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Products Found
                </div>
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      navigate(`/?search=${encodeURIComponent(item.name)}`);
                      setSuggestions([]);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-neutral-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{item.name}</p>
                      <p className="text-xs text-neutral-500">{item.unit} • ₹{item.price}</p>
                    </div>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                      View
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* System Design Dashboard Link (Round 3 Highlight) */}
            <Link
              to="/admin/system-design"
              className="relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold tracking-wide transition-all shadow-sm"
              title="Round 3 High-Level System Design & Architecture Console"
            >
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">System Design</span>
              <span className="sm:hidden">SysOps</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </Link>

            {/* Admin Portal Link */}
            <Link
              to="/admin"
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
              <span>Admin</span>
            </Link>

            {/* Delivery Partner Portal Link */}
            <Link
              to="/delivery/dashboard"
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold transition-colors"
            >
              <Bike className="w-4 h-4 text-neutral-500" />
              <span>Rider</span>
            </Link>

            {/* User Profile / Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-semibold hidden md:inline truncate max-w-[100px]">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-neutral-200 shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-900">{user?.name}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
                      <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
                        Role: {user?.role}
                      </span>
                    </div>

                    <Link
                      to="/orders"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 font-medium"
                    >
                      📦 My Orders & Tracking
                    </Link>

                    <Link
                      to="/admin/system-design"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 font-medium"
                    >
                      ⚡ System Design Operations
                    </Link>

                    <Link
                      to="/admin"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 font-medium"
                    >
                      🛠️ Admin Catalog Manager
                    </Link>

                    <Link
                      to="/delivery/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 font-medium"
                    >
                      🛵 Delivery Partner Fleet
                    </Link>

                    <div className="border-t border-neutral-100 my-1"></div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 hover:border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition-colors"
              >
                <User className="w-4 h-4 text-neutral-500" />
                <span>Login</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-brand-600/20 active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-neutral-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">My Cart</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
