import Image from 'next/image';
import Link from 'next/link';
import type { HeroBanner as HeroBannerType } from '../types';

interface HeroBannerProps {
  banner: HeroBannerType;
  className?: string;
}

export function HeroBanner({ banner, className = '' }: HeroBannerProps) {
  const content = (
    <div className={`hero-banner relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 ${className}`}>
      {banner.image_url && (
        <div className="absolute inset-0">
          <Image
            src={banner.image_url}
            alt={banner.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
      
      <div className="relative z-10 p-8 text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          {banner.title}
        </h2>
        
        {banner.description && (
          <p className="text-lg opacity-90 line-clamp-2">
            {banner.description}
          </p>
        )}
      </div>
    </div>
  );

  if (banner.link_url) {
    return (
      <Link href={banner.link_url} className="block hover:scale-[1.02] transition-transform">
        {content}
      </Link>
    );
  }

  return content;
}