import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplet, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-red-50 text-[#C62828] border border-red-100 flex items-center justify-center mx-auto shadow-sm">
            <Droplet className="w-12 h-12" />
          </div>
          <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-[#C62828] text-white font-black text-xs">
            404
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Transfusion Route Not Found
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
            The clinical registry page or resource you requested does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>

          <Link to="/">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
