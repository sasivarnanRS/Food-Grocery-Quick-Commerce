import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Activity, Bike, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-neutral-200/80 pt-12 pb-8 mt-16 text-neutral-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-lg text-neutral-900 tracking-tight">
                Quick<span className="text-brand-600">Commerce</span>
              </span>
            </div>
            <p className="text-neutral-500 leading-relaxed">
              Ultra-fast 10-minute grocery and fresh essentials delivery engineered with microservices, Redis caching, and RabbitMQ event streaming.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit">
              <span>⚡ Blinkit & Zepto-inspired Architecture</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider mb-3">
              Categories
            </h4>
            <ul className="space-y-2">
              <li><Link to="/?category=dairy" className="hover:text-brand-600 transition-colors">Dairy & Milk</Link></li>
              <li><Link to="/?category=fruits" className="hover:text-brand-600 transition-colors">Fresh Fruits</Link></li>
              <li><Link to="/?category=vegetables" className="hover:text-brand-600 transition-colors">Vegetables</Link></li>
              <li><Link to="/?category=bakery" className="hover:text-brand-600 transition-colors">Artisan Bakery</Link></li>
              <li><Link to="/?category=snacks" className="hover:text-brand-600 transition-colors">Chips & Snacks</Link></li>
              <li><Link to="/?category=beverages" className="hover:text-brand-600 transition-colors">Cold Drinks & Juices</Link></li>
            </ul>
          </div>

          {/* System & Architecture */}
          <div>
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider mb-3">
              Engineering Console
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/admin/system-design" className="hover:text-brand-600 transition-colors flex items-center gap-1.5 font-bold text-neutral-900">
                  <Activity className="w-3.5 h-3.5 text-brand-600" />
                  System Design Dashboard
                </Link>
              </li>
              <li><Link to="/admin" className="hover:text-brand-600 transition-colors">Admin Catalog Manager</Link></li>
              <li><Link to="/delivery/dashboard" className="hover:text-brand-600 transition-colors">Delivery Partner Dispatch</Link></li>
              <li><Link to="/orders" className="hover:text-brand-600 transition-colors">Real-Time Order Tracking</Link></li>
            </ul>
          </div>

          {/* Infrastructure */}
          <div>
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider mb-3">
              System Tech Stack
            </h4>
            <div className="space-y-1.5 text-neutral-500">
              <p>• API Gateway (Port 4000)</p>
              <p>• 7 Independent Microservices</p>
              <p>• Redis Cache-Aside & Tag Eviction</p>
              <p>• RabbitMQ Topic Exchange (quickcommerce.events)</p>
              <p>• MongoDB Atomic Conditional Concurrency</p>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
          <p>© 2026 QuickCommerce Platform. High-Level System Design Round 3 Challenge.</p>
          <p className="flex items-center gap-1">
            Built for production excellence with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
