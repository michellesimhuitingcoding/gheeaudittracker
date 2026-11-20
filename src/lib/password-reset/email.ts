export type PasswordResetEmail = {
  to: string;
  name: string;
  link: string;
  expiresAt: Date;
};

export type SendPasswordResetEmail = (email: PasswordResetEmail) => Promise<void>;

// The one place reset emails are sent. Email is not set up yet, so for now
// the link is written to the server log (the terminal running the app) for a
// Master Admin to pass on. Swap the body for the email provider later.
export const sendPasswordResetEmail: SendPasswordResetEmail = async ({ to, link, expiresAt }) => {
  // eslint-disable-next-line no-console -- intentional server log until email is set up
  console.info(`[password reset] Link for ${to} (expires ${expiresAt.toISOString()}): ${link}`);
};
