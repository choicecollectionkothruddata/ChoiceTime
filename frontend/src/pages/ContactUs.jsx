import { Link } from 'react-router-dom';

const EMAIL = 'choicecollectionkothrud@gmail.com';
const ADDRESS =
  'Shop No.3, Paud Rd, near Hotel Durga Cold Coffee, Tarangan Society, Ideal Colony, Kothrud, Pune, Maharashtra 411038';
const MAPS_QUERY =
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${ADDRESS}`);

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-brown-50 pt-2 sm:pt-3">
      <div className="relative overflow-hidden border-b border-brown-200/80 bg-gradient-to-b from-white to-brown-50/80">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_30%_20%,#000_0,transparent_50%),radial-gradient(circle_at_80%_40%,#000_0,transparent_45%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-14 sm:pb-16">
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 inline-flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Support</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-3">
            Contact Us
          </h1>
          <p className="text-gray-600 max-w-xl text-base sm:text-lg leading-relaxed">
            Visit us in store or reach out by email. We are happy to help with orders, sizing, and returns.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 pb-16 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Main contact column */}
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl border border-brown-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Choice Collection Kothrud</h2>
                  <p className="text-sm text-gray-500">Our store &amp; pickup point</p>
                </div>
              </div>

              <div className="space-y-4">
                <a
                  href={`mailto:${EMAIL}`}
                  className="group flex gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 transition-all hover:border-brown-200 hover:bg-white hover:shadow-md"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100 group-hover:ring-brown-200/80">
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</h3>
                    <p className="mt-1 text-sm font-medium text-gray-900 break-all sm:break-words">{EMAIL}</p>
                    <p className="mt-1 text-xs text-amber-700/90 font-medium">Tap to open your mail app</p>
                  </div>
                  <svg
                    className="hidden sm:block w-5 h-5 shrink-0 text-gray-400 group-hover:text-gray-900 transition-colors mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <a
                  href={MAPS_QUERY}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 transition-all hover:border-brown-200 hover:bg-white hover:shadow-md"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100 group-hover:ring-brown-200/80">
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Address</h3>
                    <p className="mt-1 text-sm text-gray-800 leading-relaxed">{ADDRESS}</p>
                    <p className="mt-2 text-xs font-semibold text-gray-900 inline-flex items-center gap-1">
                      Open in Maps
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Hours + note */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-brown-200 bg-white p-6 sm:p-7 shadow-sm h-full">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-base font-bold text-gray-900">Business hours</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <span className="text-gray-600">Mon – Fri</span>
                  <span className="font-semibold text-gray-900 tabular-nums">9:00 AM – 6:00 PM</span>
                </li>
                <li className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <span className="text-gray-600">Saturday</span>
                  <span className="font-semibold text-gray-900 tabular-nums">10:00 AM – 4:00 PM</span>
                </li>
                <li className="flex justify-between gap-4 py-2">
                  <span className="text-gray-600">Sunday</span>
                  <span className="font-semibold text-gray-500">Closed</span>
                </li>
              </ul>
              <p className="mt-6 text-xs text-gray-500 leading-relaxed rounded-lg bg-brown-50/80 border border-brown-100 px-3 py-2.5">
                For order updates, use Track Order or sign in to your account. We usually reply to email within one business day.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-brown-200 bg-white/70 backdrop-blur-sm px-4 py-5 sm:px-6 text-center text-sm text-gray-600">
          Website developed by{' '}
          <span className="font-semibold text-gray-900">Sumit Bolla</span>
          {' · '}
          <a href="tel:9527352323" className="font-semibold text-gray-900 underline underline-offset-2 decoration-brown-300 hover:decoration-gray-900">
            9527352323
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
