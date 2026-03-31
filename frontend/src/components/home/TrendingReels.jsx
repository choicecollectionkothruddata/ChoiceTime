import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { reelAPI } from '../../utils/api';

const isExternalUrl = (url) => /^https?:\/\//i.test(url || '');

const ProductCta = ({ productLink }) => {
  const trimmed = productLink?.trim() || '';
  if (trimmed && isExternalUrl(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-lg bg-brown-800 text-white hover:bg-brown-900 transition-colors"
      >
        Shop now
      </a>
    );
  }
  const to = trimmed ? (trimmed.startsWith('/') ? trimmed : `/${trimmed}`) : '/';
  return (
    <Link
      to={to}
      className="mt-2 inline-flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-lg bg-brown-800 text-white hover:bg-brown-900 transition-colors"
    >
      Shop now
    </Link>
  );
};

const TrendingReels = () => {
  const [reels, setReels] = useState([]);
  const [ready, setReady] = useState(false);
  const videoRefs = useRef({});

  useEffect(() => {
    let cancelled = false;
    reelAPI
      .getPublicReels()
      .then((res) => {
        if (cancelled || !res?.success || !res?.data?.reels?.length) return;
        setReels(res.data.reels);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pauseOthers = useCallback((exceptId) => {
    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (id !== exceptId && el && !el.paused) el.pause();
    });
  }, []);

  const handleCardPointerEnter = (id) => {
    const el = videoRefs.current[id];
    if (!el) return;
    pauseOthers(id);
    el.play().catch(() => {});
  };

  const handleCardPointerLeave = (id) => {
    const el = videoRefs.current[id];
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  const togglePlay = (id, e) => {
    e.stopPropagation();
    const el = videoRefs.current[id];
    if (!el) return;
    if (el.paused) {
      pauseOthers(id);
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  if (!ready || reels.length === 0) return null;

  return (
    <section className="pt-4 md:pt-6 pb-10 md:pb-16 bg-brown-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 md:mb-11">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase tracking-widest">
            Trending Reels
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Explore trending picks for every style
          </p>
          <div className="mt-3 mx-auto w-14 h-0.5 bg-gray-800 rounded-full"></div>
        </div>

        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
          {reels.map((reel) => (
            <article
              key={reel._id}
              className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start flex flex-col"
              onPointerEnter={() => handleCardPointerEnter(reel._id)}
              onPointerLeave={() => handleCardPointerLeave(reel._id)}
            >
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg ring-1 ring-black/10 aspect-[9/16]">
                <video
                  ref={(node) => {
                    if (node) videoRefs.current[reel._id] = node;
                    else delete videoRefs.current[reel._id];
                  }}
                  src={reel.videoUrl}
                  poster={reel.thumbnailUrl || undefined}
                  className="w-full h-full object-cover cursor-pointer"
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  onClick={(e) => togglePlay(reel._id, e)}
                />
              </div>
              {reel.title && (
                <p className="mt-2 text-xs sm:text-sm font-medium text-gray-800 text-center line-clamp-2 leading-snug">
                  {reel.title}
                </p>
              )}
              <ProductCta productLink={reel.productLink} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingReels;
