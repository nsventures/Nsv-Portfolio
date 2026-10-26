/**
 * Commercial deck pages, rendered from the source PDF, with the URLs and phone
 * numbers found in its text layer as overlay hotspots.
 * Regenerate with: node scripts/build-commercial-pages.mjs
 */
export interface CommercialLink {
  href: string
  label: string
  /** Percentages of the page image, so overlays scale with it. */
  x: number
  y: number
  w: number
  h: number
}

export interface CommercialPage {
  src: string
  links: CommercialLink[]
}

export const COMMERCIAL_PAGES: CommercialPage[] = [
  {
    src: `${import.meta.env.BASE_URL}commercial/page-01.webp`,
    links: [],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-02.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-03.webp`,
    links: [],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-04.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-05.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/watch?v=we7nfoWxzbY", label: "youtube.com", x: 44.93, y: 88.07, w: 10.25, h: 4.79 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-06.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://youtu.be/E8c38-oGHHs", label: "youtu.be", x: 45.92, y: 88.07, w: 7.93, h: 4.79 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-07.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://youtu.be/kxV8cclXzL4", label: "youtu.be", x: 46.03, y: 88.07, w: 8.08, h: 4.79 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-08.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-09.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-10.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-11.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://youtu.be/RugCySwBd0o", label: "youtu.be", x: 45.97, y: 88.07, w: 8.15, h: 4.79 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-12.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-13.webp`,
    links: [
      { href: "https://www.nsventures.in", label: "nsventures.in", x: 7.87, y: 92.93, w: 24.38, h: 1.82 },
      { href: "tel:+917506203777", label: "Phone", x: 74.18, y: 92.88, w: 22.33, h: 2.06 },
      { href: "https://www.youtube.com/@NSVentures", label: "youtube.com", x: 35.53, y: 91.19, w: 5.07, h: 4.26 },
      { href: "https://www.linkedin.com/company/ns-ventures-india", label: "linkedin.com", x: 41.68, y: 91.19, w: 5.04, h: 4.26 },
      { href: "https://www.instagram.com/ns_ventures/", label: "instagram.com", x: 47.95, y: 90.31, w: 4.94, h: 5.02 },
      { href: "https://www.facebook.com/NSVenturessocial/", label: "facebook.com", x: 54, y: 90.31, w: 5.15, h: 5.02 },
      { href: "https://in.pinterest.com/nsventures1/", label: "in.pinterest.com", x: 60.48, y: 90.31, w: 4.49, h: 5.02 },
    ],
  },
  {
    src: `${import.meta.env.BASE_URL}commercial/page-14.webp`,
    links: [],
  },
]
