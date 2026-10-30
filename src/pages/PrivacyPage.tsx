import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
          UK GDPR & Data Protection
        </span>
        <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">
          Privacy Policy
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Last revised: 30 October 2026 • Bloom by Pela, Newcastle upon Tyne, UK
        </p>
      </div>

      <div className="prose prose-stone max-w-none text-xs leading-relaxed space-y-6 text-stone-700">
        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">1. Data Controller</h3>
          <p>
            Bloom by Pela is the data controller responsible for your personal data under the UK Data Protection Act 2018 and the UK General Data Protection Regulation (UK GDPR).
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">2. What Data We Collect</h3>
          <p>
            We collect personal information required to process and deliver your orders, including your full name, email address, UK delivery address, contact telephone number, and order history. Payment card data is processed directly and securely by Stripe; we never store your raw credit or debit card numbers on our servers.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-serif text-base font-bold text-stone-900">3. Your Statutory Rights</h3>
          <p>
            Under UK GDPR, you have the right to access your personal data, rectify inaccuracies, request erasure ('right to be forgotten'), restrict processing, and receive a portable copy of your data. You may exercise these rights directly within your Account portal or by emailing hello@bloombypela.com.
          </p>
        </section>
      </div>
    </div>
  );
};
