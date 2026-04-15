/** Homepage content — edit here, not in the component. */

export const identity = {
  name: 'Rob Scholey',
  title: 'Software Engineer',
};

export const bio = [
  'This is my personal "everything" app — a unified portal for my portfolio, projects, and any websites or PWAs I build for myself. Every sub-application lives on its own subdomain with a single authentication layer and simplified hosting setup.',
  "In an age where AI and bots scrape everything publicly available, I value my privacy. My portfolio and projects are access-restricted — not because they're secret, but because I choose who sees them and when. If you'd like access, request it below.",
];

export const socialLinks = [
  {
    label: 'GitHub',
    href: 'https://github.com/robertscholey98',
    icon: 'github' as const,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/robscholey',
    icon: 'linkedin' as const,
  },
];

export const actions = {
  message: {
    cardTitle: 'Send me a message',
    cardDescription: 'Get in touch directly',
    dialogTitle: 'Send me a message',
    dialogDescription: "I'll get back to you as soon as I can.",
    submitLabel: 'Send',
    fields: [
      { id: 'message-name', label: 'Name', type: 'text' as const, placeholder: 'Your name' },
      {
        id: 'message-email',
        label: 'Email',
        type: 'email' as const,
        placeholder: 'you@example.com',
      },
      {
        id: 'message-body',
        label: 'Message',
        type: 'textarea' as const,
        placeholder: "What's on your mind?",
        rows: 4,
      },
    ],
  },
  access: {
    cardTitle: 'Request portfolio access',
    cardDescription: 'Get an access code for my projects',
    dialogTitle: 'Request portfolio access',
    dialogDescription:
      "Enter your email and I'll send you an access code to view my portfolio and projects.",
    submitLabel: 'Request access',
    fields: [
      { id: 'access-name', label: 'Name', type: 'text' as const, placeholder: 'Your name' },
      {
        id: 'access-email',
        label: 'Email',
        type: 'email' as const,
        placeholder: 'you@example.com',
      },
      {
        id: 'access-context',
        label: 'Context',
        labelSuffix: '(optional)',
        type: 'textarea' as const,
        placeholder: 'e.g. Recruiter at Acme Corp, saw your CV...',
        rows: 3,
      },
    ],
  },
};
