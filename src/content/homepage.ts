/**
 * Homepage content — edit here, not in the component.
 * All text, links, and form configurations for the landing page.
 */

/** The site owner's name and professional title. */
export const identity = {
  name: 'Rob Scholey',
  title: 'Software Engineer',
};

/** One-line description shown below the title on the landing page. */
export const tagline = 'A private, unified portal for my projects and portfolio.';

/** Social media links shown in the footer of the landing page. */
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

/** Contact and access request drawer configurations. */
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
