import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';

export const AccessDeniedPage: React.FC = () => {
  const { role } = useRole();

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
        <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          Access Restricted (403)
        </h2>
        <p className="mt-2 text-xs text-stone-600 leading-relaxed">
          The requested administration area is role-gated. Your current authenticated role is:{' '}
          <span className="font-semibold text-red-700 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-200">
            {role}
          </span>
          .
        </p>
        <p className="mt-2 text-xs text-stone-500">
          In production, access requires a verified Firebase custom claim (<code>role: 'admin'</code>).
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link to="/">
            <Button variant="outline" size="sm" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Return to Storefront
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
