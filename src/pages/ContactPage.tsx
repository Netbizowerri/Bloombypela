import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { postServerApi } from '../lib/serverApi';
import { CONTACT_EMAIL } from '../lib/site';
import { Mail, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface ContactResponse {
  ok: true;
}

/** Mirrors the server schema in functions/src/contact.ts. */
const MIN_MESSAGE_LENGTH = 10;

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');
  // Honeypot: hidden from people, tempting for bots. Must stay empty.
  const [website, setWebsite] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const { success, error: toastError } = useToast();

  const messageTooShort = message.trim().length < MIN_MESSAGE_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);

    if (messageTooShort) {
      setSubmitError(`Please add a little more detail (at least ${MIN_MESSAGE_LENGTH} characters).`);
      return;
    }

    setIsLoading(true);
    try {
      await postServerApi<Record<string, unknown>, ContactResponse>('/api/contact', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject,
        message: message.trim(),
        website,
      });
      setIsSent(true);
      success('Message sent', 'Thank you. A member of our Newcastle team will be in touch shortly.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'We could not send your message.';
      setSubmitError(reason);
      toastError('Message not sent', reason);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsSent(false);
    setTouched(false);
    setSubmitError(null);
    setName('');
    setEmail('');
    setPhone('');
    setSubject('General Enquiry');
    setMessage('');
    setWebsite('');
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
                  NE1 &amp; NE2 Delivery Zone
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#cb932b] shrink-0" />
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline text-stone-900">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-[#faf1de] p-5 rounded-2xl border border-[#f4e1ba] text-xs text-[#73451c] space-y-1">
            <h4 className="font-bold">Weekly Order Support</h4>
            <p className="leading-relaxed">
              For changes to your juice delivery, please contact us as early as possible and we will do our best to help.
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
              <Button variant="outline" size="sm" onClick={resetForm}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Name"
                  placeholder="e.g. Jordan Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="jordan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <Input
                label="Phone (optional)"
                type="tel"
                placeholder="07700 900000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />

              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Subject
                </label>
                <select
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-800 shadow-xs focus:border-[#7e2b44] focus:outline-none focus:ring-1 focus:ring-[#7e2b44]"
                >
                  <option value="General Enquiry">General Enquiry</option>
                  <option value="Weekly Subscription">Weekly Subscription Support</option>
                  <option value="Corporate Catering">Corporate Catering / Office Drops</option>
                  <option value="Wholesale">Wholesale &amp; Stockist Requests</option>
                  <option value="Allergens">Allergen Clarification</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Your Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can help..."
                  aria-invalid={touched && messageTooShort}
                  aria-describedby={touched && messageTooShort ? 'contact-message-error' : undefined}
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-800 shadow-xs focus:border-[#7e2b44] focus:outline-none focus:ring-1 focus:ring-[#7e2b44]"
                  required
                />
                {touched && messageTooShort && (
                  <p id="contact-message-error" className="mt-1 text-[11px] text-red-700">
                    Please add a little more detail (at least {MIN_MESSAGE_LENGTH} characters).
                  </p>
                )}
              </div>

              {/* Honeypot: hidden from sighted users and screen readers. */}
              <div aria-hidden="true" className="hidden">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{submitError}</p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                  isLoading={isLoading}
                  rightIcon={<Send className="h-4 w-4" />}
                >
                  Send Enquiry
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-stone-500">
                We use your details only to answer your message. See our{' '}
                <a href="/privacy" className="underline">
                  privacy policy
                </a>
                .
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
