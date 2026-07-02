export interface Service {
  id: string
  title: string
  description: string
  index: string
  image: string
  tagline: string
}

export const services: Service[] = [
  {
    id: 'property-videos',
    index: '01',
    title: 'Property Marketing Videos',
    tagline: 'Films that sell before the site visit',
    description:
      'Cinematic films that reveal the soul of a property — crafted to convert viewers into buyers through narrative, light, and motion.',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  },
  {
    id: 'drone',
    index: '02',
    title: 'Drone Cinematography',
    tagline: 'Perspectives money cannot buy on ground',
    description:
      'Aerial perspectives that showcase scale, location, and context. From sweeping establishing shots to dynamic FPV sequences.',
    image: 'https://images.unsplash.com/photo-1477959857187-967743796279?w=800&q=80',
  },
  {
    id: 'photography',
    index: '03',
    title: 'Real Estate Photography',
    tagline: 'Every frame, architecturally precise',
    description:
      'Editorial-grade stills with architectural precision — every frame composed to highlight space, texture, and natural light.',
    image: 'https://images.unsplash.com/photo-1600210492493-3ca856a3d2f3?w=800&q=80',
  },
  {
    id: 'social',
    index: '04',
    title: 'Social Media Content',
    tagline: 'Built for reach, rooted in brand',
    description:
      'Platform-native cutdowns and reels engineered for reach — maintaining brand consistency across every touchpoint.',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
  },
  {
    id: 'storytelling',
    index: '05',
    title: 'Brand Storytelling',
    tagline: 'Developments become destinations',
    description:
      'Visual narratives that position developments as lifestyle destinations — building emotional connection before the first site visit.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  },
  {
    id: 'campaigns',
    index: '06',
    title: 'Promotional Campaigns',
    tagline: 'Launch day, fully armed',
    description:
      'End-to-end launch campaigns spanning hero films, digital assets, and investor presentations under one creative vision.',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
  },
]
