import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { success } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
      success('Message Sent', 'Thank you. A member of our Newcastle team will be in touch shortly.');
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 text-left">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#cb932b]">
          Customer Care
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          Contact Bloom by Pela
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-2">
          Have questions regarding subscriptions, corporate catering, wholesale or bespoke juice events?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Info Side */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Direct Enquiries</h3>
            <div className="space-y-3 text-xs text-stone-600">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#7e2b44] shrink-0 mt-0.5" />
                <span>
                  Bloom by Pela Ltd<br />
                  Newcastle upon Tyne, UK<br />
                  NE1 & NE2 Delivery Zone
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#cb932b] shrink-0" />
                <a href="mailto:hello@bloombypela.com" className="hover:underline text-stone-900">
                  hello@bloombypela.com
                </a>
              </div>
            </div>
          </div>

          <div className="bg-[#faf1de] p-5 rounded-2xl border border-[#f4e1ba] text-xs text-[#73451c] space-y-1">
            <h4 className="font-bold">Weekly Order Support</h4>
            <p className="leading-relaxed">
              For immediate changes to your Thursday juice delivery, please ensure requests reach us before Monday 12:00 PM.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
          {isSent ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900">Thank You</h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                Your message has been safely received. We will respond within one business day.
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsSent(false)}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Name"
                  placeholder="e.g. Jordan Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="jordan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-800 shadow-xs focus:border-[#7e2b44] focus:outline-none focus:ring-1 focus:ring-[#7e2b44]"
                >
                  <option value="General Enquiry">General Enquiry</option>
                  <option value="Weekly Subscription">Weekly Subscription Support</option>
                  <option value="Corporate Catering">Corporate Catering / Office Drops</option>
                  <option value="Wholesale">Wholesale & Stockist Requests</option>
                  <option value="Allergens">Allergen Clarification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                  Your Message
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can help..."
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-800 shadow-xs focus:border-[#7e2b44] focus:outline-none focus:ring-1 focus:ring-[#7e2b44]"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                  rightIcon={<Send className="h-4 w-4" />}
                >
                  Send Enquiry
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
