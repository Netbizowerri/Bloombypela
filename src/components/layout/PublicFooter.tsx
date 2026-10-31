import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Mail, Sparkles, Heart } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#0a3318] text-cream-100 border-t border-[#155d2c]">
      {/* Brand Header & Value Proposition */}
      <div className="border-b border-[#155d2c]/40 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#155d2c]/30 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="inline-block group">
              <img
                src="https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloom_By_Pela_Nourish_Naturally"
                alt="Bloom by Pela"
                className="h-[68px] sm:h-[78px] w-auto max-w-[320px] object-contain group-hover:opacity-90 transition-opacity"
                width={600}
                height={150}
              />
            </Link>
            <p className="text-[11px] text-emerald-200 mt-2">Newcastle upon Tyne, United Kingdom</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-emerald-100">
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
              Life in Every Bite • Life in Every Sip
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start space-y-2">
            <span className="h-10 w-10 rounded-full bg-[#c9932b]/20 flex items-center justify-center text-[#deb252] mb-1">
              <Sparkles className="h-5 w-5" />
            </span>
            <h4 className="font-serif text-lg font-semibold text-white">Life in Every Bite</h4>
            <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
              Authentic Plantain chips, Coconut chips, Chin chin, Groundnuts, and Cashews sourced from trusted smallholders.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start space-y-2">
            <span className="h-10 w-10 rounded-full bg-[#2e8b49]/30 flex items-center justify-center text-emerald-300 mb-1">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h4 className="font-serif text-lg font-semibold text-white">Life in Every Sip</h4>
            <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
              Small-batch cold-pressed fresh juices and drinks (Tropical Bloom, Skin Glow/Skin Flow, Detox juice blend, Zobo, Ginger shots) freshly prepared in the UK.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start space-y-2">
            <span className="h-10 w-10 rounded-full bg-[#c9932b]/20 flex items-center justify-center text-[#deb252] mb-1">
              <MapPin className="h-5 w-5" />
            </span>
            <h4 className="font-serif text-lg font-semibold text-white">Newcastle upon Tyne</h4>
            <p className="text-xs text-stone-300 max-w-xs leading-relaxed">
              Delivered fresh across Newcastle postcodes (NE1–NE10) every Thursday. Collection points also available.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h5 className="font-serif text-sm font-semibold text-gold-300 uppercase tracking-wider mb-4">
              Catalogue
            </h5>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <Link to="/shop/snacks" className="hover:text-gold-200 transition-colors">
                  Snacks ("Life in Every Bite")
                </Link>
              </li>
              <li>
                <Link to="/shop/juices" className="hover:text-gold-200 transition-colors">
                  Fresh juices and drinks ("Life in Every Sip")
                </Link>
              </li>
              <li>
                <Link to="/subscriptions" className="hover:text-gold-200 transition-colors">
                  Weekly Juice Subscriptions
                </Link>
              </li>
              <li>
                <Link to="/bundles" className="hover:text-gold-200 transition-colors">
                  Curated Gift Bundles
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-serif text-sm font-semibold text-gold-300 uppercase tracking-wider mb-4">
              Fulfilment
            </h5>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <Link to="/delivery" className="hover:text-gold-200 transition-colors">
                  Delivery Schedule & Cut-offs
                </Link>
              </li>
              <li>
                <Link to="/delivery#postcodes" className="hover:text-gold-200 transition-colors">
                  Eligible Newcastle Postcodes
                </Link>
              </li>
              <li>
                <Link to="/collection" className="hover:text-gold-200 transition-colors">
                  Collection Points
                </Link>
              </li>
              <li>
                <Link to="/faqs" className="hover:text-gold-200 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-serif text-sm font-semibold text-gold-300 uppercase tracking-wider mb-4">
              Policies & Safety
            </h5>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <Link to="/allergens" className="hover:text-gold-200 transition-colors">
                  14 UK Major Allergens Info
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-gold-200 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-gold-200 transition-colors">
                  Privacy Policy (UK GDPR)
                </Link>
              </li>
              <li>
                <Link to="/subscription-terms" className="hover:text-gold-200 transition-colors">
                  Subscription Terms
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-gold-200 transition-colors">
                  Delivery & Returns Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-serif text-sm font-semibold text-gold-300 uppercase tracking-wider mb-4">
              Get in Touch
            </h5>
            <p className="text-xs text-stone-300 mb-3 leading-relaxed">
              Questions about bulk orders, weekly deliveries or allergens?
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-xs text-[#deb252] hover:text-gold-200 font-semibold"
            >
              <Mail className="h-4 w-4" /> Contact Customer Care
            </Link>
            <div className="mt-4 pt-4 border-t border-[#155d2c]/40 text-[11px] text-stone-400">
              <p>Registered in England & Wales</p>
              <p>Newcastle upon Tyne, UK</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[#155d2c]/40 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <p>© {new Date().getFullYear()} Bloom by Pela (bloombypela.com). Nourish. Naturally. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Payments powered by Stripe</span>
            <span>•</span>
            <span>Cards, Apple Pay, Google Pay</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
