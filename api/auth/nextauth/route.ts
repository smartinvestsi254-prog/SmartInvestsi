import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    // Your authentication provider setup (Credentials, Google, GitHub, etc.)
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: sync flags from DB to JWT
      if (user) {
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        token.id = dbUser.id;
        token.isAdmin = dbUser.isAdmin ?? false;
        token.isPremium = dbUser.isPremium ?? false;
      }

      // Allow manual session update (e.g. right after payment)
      if (trigger === 'update' && session) {
        token.isPremium = session.isPremium;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isPremium = token.isPremium as boolean;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
