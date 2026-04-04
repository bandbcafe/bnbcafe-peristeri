import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const robotsTxt = `# Robots.txt
# Allow all search engines to index public pages

User-agent: *
Allow: /
Allow: /menu
Allow: /reservations
Allow: /contact
Allow: /checkout
Allow: /order
Allow: /orders

# Block private routes
Disallow: /api/
Disallow: /_next/
Disallow: /maintenance

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  });
}
