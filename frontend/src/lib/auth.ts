import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { loginSchema } from './schemas/auth.schema';
import { AuthApi } from './api/auth.api';

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { maxAge: 86370 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      async authorize(input) {
        try {
          const data = loginSchema.parse(input);
          const { access_token, user } = await AuthApi.login(data);
          return { ...user, access_token };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.clinicId = user.clinicId;
        token.avatarUrl = user.avatarUrl;
        token.access_token = user.access_token;
      }
      if (trigger === 'update') {
        if (session?.user?.avatarUrl) token.avatarUrl = session.user.avatarUrl;
        if (session?.user?.firstName)
          token.firstName = session.user.firstName;
        if (session?.user?.lastName) token.lastName = session.user.lastName;
      }
      return token;
    },
    session({ token, session }) {
      session.user.id = token.sub;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      session.user.role = token.role;
      session.user.clinicId = token.clinicId;
      session.user.avatarUrl = token.avatarUrl;
      session.user.access_token = token.access_token;
      return session;
    },
  },
});
