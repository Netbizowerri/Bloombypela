import React from 'react';
import { ContentPage } from './ContentPage';

/**
 * Storefront routes whose copy lives in the staff-editable `content`
 * collection. Each wrapper fixes the document id, canonical path and the
 * fallback heading/description used before Firestore responds.
 */

export const FaqsPage: React.FC = () => (
  <ContentPage
    slug="faqs"
    path="/faqs"
    heading="Frequently Asked Questions"
    description="Answers about ordering, Newcastle delivery, collection and weekly juice subscriptions."
  />
);

export const TermsRoutePage: React.FC = () => (
  <ContentPage
    slug="terms"
    path="/terms"
    heading="Terms and Conditions"
    description="The terms that apply when you order snacks or cold-pressed juices from Bloom by Pela."
  />
);

export const PrivacyRoutePage: React.FC = () => (
  <ContentPage
    slug="privacy"
    path="/privacy"
    heading="Privacy Policy"
    description="How Bloom by Pela collects, uses and protects your personal data under the UK GDPR."
  />
);

export const SubscriptionTermsPage: React.FC = () => (
  <ContentPage
    slug="subscription-terms"
    path="/subscription-terms"
    heading="Subscription Terms"
    description="How weekly juice subscriptions are billed, paused and cancelled."
  />
);

export const ReturnsPolicyPage: React.FC = () => (
  <ContentPage
    slug="returns"
    path="/returns"
    heading="Delivery and Returns Policy"
    description="Delivery coverage, fees and what to do if something is wrong with your order."
  />
);
