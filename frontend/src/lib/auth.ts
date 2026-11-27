import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { loginSchema } from './schemas/auth.schema';
import { AuthApi } from './api/auth.api';
import { LoginErrorCode, staffLoginCode } from './auth-errors';

/** Auth.js passes `code` from authorize() through to the login action. */
class StaffNotApprovedSignin extends CredentialsSignin {
  constructor(code: LoginErrorCode) {
    super();
    this.code = code;
  }
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { maxAge: 86370 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      async authorize(input) {
        let result;
        try {
          const data = loginSchema.parse(input);
          result = await AuthApi.login(data);
        } catch (error) {
          // D74: staff awaiting or refused approval get their own message.
          const code = staffLoginCode(error);
          if (code) throw new StaffNotApprovedSignin(code);
          return null;
        }
        return { ...result.user, access_token: result.access_token };
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
        if (session?.user?.firstName) token.firstName = session.user.firstName;
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
