import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Legal & Compliance
        </span>
        <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">
          Terms and Conditions
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Last revised: 30 October 2026 • Bloom by Pela, Newcastle upon Tyne, UK
        </p>
      </div>

      <div className="prose prose-stone max-w-none text-xs leading-relaxed space-y-6 text-stone-700">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
          <strong>Client Notice:</strong> This document represents a technical baseline specification and draft agreement for Bloom by Pela e-commerce operations. It should be submitted for standard legal review by the brand owner before full live commercial launch.
        </div>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">1. Business Information</h3>
          <p>
            Bloom by Pela operates from Newcastle upon Tyne, United Kingdom. We supply packaged Nigerian artisan snacks ("Life in Every Bite") and cold-pressed wellness juices and drinks ("Life in Every Sip") through bloombypela.com.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">2. Perishable Goods & Cold-Pressed Juices</h3>
          <p>
            Our bespoke juices and tonics are freshly prepared and raw (unpasteurised). They must be refrigerated immediately upon receipt at or below 4°C. Under the UK Consumer Contracts Regulations 2013, perishable goods that deteriorate rapidly are exempt from statutory 14-day cancellation rights once dispatched.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">3. Delivery Schedule & Cut-off Times</h3>
          <p>
            Delivery takes place on designated Thursdays across designated outward postcode districts in Newcastle upon Tyne (e.g. NE1–NE10). The cut-off time for Thursday deliveries is Monday at 12:00 PM London time. Orders placed after this cut-off will automatically be scheduled for the following week's delivery.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">4. Weekly Juice Subscriptions</h3>
          <p>
            Weekly subscriptions automatically renew every Monday at 12:00 PM London time at the published rate. Customers may skip any delivery, pause for between 1 to 8 weeks, change flavours, or cancel at any time prior to the Monday 12:00 PM cut-off.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">5. Governing Law</h3>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of England and Wales.
          </p>
        </section>
      </div>
    </div>
  );
};
