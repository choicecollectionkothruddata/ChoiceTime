import { Link } from 'react-router-dom';

const DESKTOP_BANNER =
  'https://ik.imagekit.io/eu78h8v4i/static/hero-banner-1_7jJ62z0ld.png';

const MOBILE_BANNER =
  'https://ik.imagekit.io/eu78h8v4i/static/hero-banner-2_C4i3TcXjQ.png';

const HeroCarousel = () => (
  <div className="relative w-full overflow-hidden">
    <Link to="/" className="block">
      <picture>
        <source media="(max-width: 767px)" srcSet={MOBILE_BANNER} />
        <img
          src={DESKTOP_BANNER}
          alt="Banner"
          className="w-full h-auto object-cover block select-none"
          draggable={false}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    </Link>
  </div>
);

export default HeroCarousel;
