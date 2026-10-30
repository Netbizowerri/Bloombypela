import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
        <div className="h-16 w-16 rounded-full bg-[#fbf4f5] text-[#7e2b44] flex items-center justify-center mx-auto mb-4">
          <Compass className="h-8 w-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-gold-600">
          Error 404
        </span>
        <h2 className="mt-1 font-serif text-3xl font-bold text-stone-900">
          Page Not Found
        </h2>
        <p className="mt-2 text-xs text-stone-600 leading-relaxed">
          The page you are looking for doesn't exist or has been moved. Discover our handcrafted Nigerian snacks or cold-pressed juices below.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="primary" size="md" leftIcon={<Home className="h-4 w-4" />}>
              Back to Home
            </Button>
          </Link>
          <Link to="/shop/snacks">
            <Button variant="outline" size="md">
              Browse Snacks
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
