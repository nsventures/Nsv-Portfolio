export interface Testimonial {
  id: string
  name: string
  designation: string
  company: string
  quote: string
  image: string
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Rajesh Malhotra',
    designation: 'Managing Director',
    company: 'Azure Developers',
    quote:
      'NS Ventures didn\'t just shoot our project — they understood our buyer persona and crafted a film that spoke directly to them. Our pre-launch inquiries tripled within the first week of release.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
  },
  {
    id: '2',
    name: 'Priya Sharma',
    designation: 'Head of Marketing',
    company: 'Meridian Realty Group',
    quote:
      'The attention to detail is extraordinary. Every frame feels intentional. They elevated our brand perception from "another developer" to a premium lifestyle choice.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
  },
  {
    id: '3',
    name: 'Arjun Kapoor',
    designation: 'CEO',
    company: 'Horizon Properties',
    quote:
      'Working with NS Ventures felt like collaborating with a film studio, not a vendor. The launch campaign they delivered became the benchmark for our entire portfolio.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  },
  {
    id: '4',
    name: 'Meera Iyer',
    designation: 'Creative Director',
    company: 'Obsidian Infrastructure',
    quote:
      'Their drone work alone justified the investment. The aerial sequences gave investors a perspective on our master plan that no brochure could achieve.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
  },
]
