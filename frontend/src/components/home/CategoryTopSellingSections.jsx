import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';
import { productAPI } from '../../utils/api';

const ITEMS_LIMIT = 8;

const CategoryTopSellingSections = () => {
  const [sections, setSections] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    productAPI
      .getHomeTopSelling({ limit: String(ITEMS_LIMIT) })
      .then((res) => {
        if (cancelled || !res?.success || !Array.isArray(res?.data?.sections)) return;
        setSections(res.data.sections);
      })
      .catch((err) => {
        console.error('[CategoryTopSellingSections] API error:', err);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || sections.length === 0) return null;

  return (
    <div className="bg-brown-50">
      {sections.map((section) => (
        <section
          key={section.slug || section.label}
          className="py-8 md:py-10 border-t border-gray-200/90"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 md:mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-1">Top selling</p>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-wide">
                  {section.label}
                </h2>
              </div>
              <Link
                to={section.viewAllPath || `/${section.slug}`}
                className="text-sm font-semibold text-gray-800 underline underline-offset-4 decoration-gray-400 hover:decoration-gray-800 shrink-0"
              >
                View all
              </Link>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
              {section.products.map((product) => (
                <div
                  key={product._id || product.id}
                  className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] snap-start"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default CategoryTopSellingSections;
