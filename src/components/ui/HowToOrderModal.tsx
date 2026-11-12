import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Calendar, Truck, ShoppingBag, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HowToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToOrderModal: React.FC<HowToOrderModalProps> = ({ isOpen, onClose }) => {
  const steps = [
    {
      step: '01',
      title: 'Choose Your Treats & Juices',
      description:
        'Browse our authentic Nigerian snacks (Plantain chips, Coconut chips, Chin chin, Groundnuts, Cashews) or select your favourite fresh juices and drinks.',
      icon: ShoppingBag,
      color: 'bg-emerald-50 text-[#155d2c] border-emerald-200',
    },
    {
      step: '02',
      title: 'Order Any Time',
      description:
        'Place your order whenever you like - there is no order cut-off. Juices and snacks are prepared fresh as they are ordered.',
      icon: Clock,
      color: 'bg-[#faf2dc] text-[#8b5b1a] border-[#f5e3b5]',
    },
    {
      step: '03',
      title: 'Delivery or Collection',
      description:
        'We deliver fresh across Newcastle (NE1–NE10) and offer local click & collect in Jesmond and the City Centre. Delivery fees are shown at checkout.',
      icon: Truck,
      color: 'bg-emerald-50 text-[#155d2c] border-emerald-200',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How Ordering Works"
      description="Simple, fresh, and scheduled weekly for Newcastle upon Tyne."
      maxWidth="lg"
    >
      <div className="space-y-6 pt-2 text-left">
        <div className="space-y-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-white hover:border-[#deb252] transition-colors"
            >
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold shrink-0 border ${s.color}`}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                    Step {s.step}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-stone-300" />
                  <h4 className="font-serif text-sm font-bold text-stone-900">{s.title}</h4>
                </div>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#0a3318] to-[#155d2c] text-white flex items-center justify-between gap-4">
          <div className="text-xs">
            <span className="font-bold text-gold-300 block">Weekly Juice Subscriptions</span>
            <span className="text-emerald-100 text-[11px]">
              New weekly plans are coming soon. Pricing will be published once finalised.
            </span>
          </div>
          <Link to="/subscriptions" onClick={onClose} className="shrink-0">
            <Button variant="gold" size="sm" className="text-xs font-bold text-stone-900">
              Learn More
            </Button>
          </Link>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="primary" size="md" onClick={onClose}>
            Got it, Let's Shop
          </Button>
        </div>
      </div>
    </Modal>
  );
};
