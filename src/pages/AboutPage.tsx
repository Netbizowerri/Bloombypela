import React from 'react';
import { Sparkles, MapPin, Heart, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 text-left">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#cb932b]">
          Our Heritage & Mission
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 leading-tight">
          Crafted with Soul in Newcastle upon Tyne
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
          Bridging vibrant West African snacking traditions with pure, cold-pressed wellness vitality in the North East.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#7e2b44]">
            "Life in Every Bite"
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            Bloom by Pela was born from a longing for authentic, premium West African snack foods that honour age-old recipes. We source our plantains and coconuts directly from sustainable Nigerian growers who cultivate produce under the West African sun.
          </p>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            Every batch of plantain chips is kettle-cooked in small portions to guarantee that signature golden snap without unnecessary greasiness or artificial flavourings.
          </p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl aspect-4/3 bg-stone-100">
          <img
            src="https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=80"
            alt="Handcrafted snacks preparation"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
        <div className="rounded-2xl overflow-hidden shadow-xl aspect-4/3 bg-stone-100 md:order-2">
          <img
            src="https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=800&q=80"
            alt="Fresh cold pressed juices"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-4 md:order-1">
          <h2 className="font-serif text-2xl font-bold text-[#245840]">
            "Life in Every Sip"
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            Our juices are freshly cold-pressed right here in the UK. We never use concentrates, heat pasteurisation, or synthetic preservatives. From our fiery ginger wellness shots to our slow-brewed hibiscus Zobo tonic, each bottle is a celebration of raw botanicals and living nutrients.
          </p>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            We batch-press every week for delivery on Thursdays, ensuring Newcastle customers experience the freshest possible pressed juice at its nutritional peak.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Heart className="h-6 w-6 text-[#7e2b44] mb-2" />
          <h4 className="font-serif text-base font-bold text-stone-900">Direct Smallholder Trade</h4>
          <p className="text-xs text-stone-500 mt-1">
            Fair prices paid directly to Nigerian farmers, supporting agricultural communities.
          </p>
        </div>
        <div>
          <ShieldCheck className="h-6 w-6 text-[#245840] mb-2" />
          <h4 className="font-serif text-base font-bold text-stone-900">Strict UK Allergen Rigour</h4>
          <p className="text-xs text-stone-500 mt-1">
            Full compliance with UK 14-allergen legislation. Clear ingredient transparency on every label.
          </p>
        </div>
        <div>
          <MapPin className="h-6 w-6 text-[#cb932b] mb-2" />
          <h4 className="font-serif text-base font-bold text-stone-900">Newcastle Roots</h4>
          <p className="text-xs text-stone-500 mt-1">
            Proudly based in Newcastle upon Tyne, serving our local community with fresh personal delivery.
          </p>
        </div>
      </div>
    </div>
  );
};
