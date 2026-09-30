import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/api/google-vacation-rentals/',
        '/api/properties/*/gvr-feed',
        '/google-vacation-rentals-feed.xml',
      ],
      disallow: ['/admin/', '/api/'],
    },
    sitemap: [
      'https://www.realstock.com.br/sitemap.xml',
      'https://www.realstock.com.br/sitemap-vacation-rentals.xml',
    ],
  };
}
