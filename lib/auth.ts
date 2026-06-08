import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "credentials",
    name: "Email + password",
    credentials: {
      email: { label: "Work email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      // Imported lazily so the bcrypt + Prisma + email graph it pulls in stays
      // OUT of the middleware bundle (this only runs at sign-in, in Node).
      const { verifyUserPassword } = await import("@/lib/signup");
      const user = await verifyUserPassword(email, password);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? email.split("@")[0],
        image: user.image,
      };
    },
  }),
  Credentials({
    id: "dev-email",
    name: "Demo (no password)",
    credentials: {
      email: { label: "Work email", type: "email", placeholder: "you@company.com" },
    },
    async authorize(credentials) {
      // Passwordless demo path: any email logs in as a synthetic user mapped to
      // the seeded demo workspace (ws_acme). Real signups use the credentials
      // provider above; their session.user.id is a real cuid.
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      if (!email || !email.includes("@")) return null;
      const name = email
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        id: `dev:${email}`,
        email,
        name,
        image: null,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.sub as string) ?? "";
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = (token.picture as string | null) ?? undefined;
      }
      return session;
    },
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const isAppRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/inbox") ||
        pathname.startsWith("/calendar") ||
        pathname.startsWith("/crm") ||
        pathname.startsWith("/sales") ||
        pathname.startsWith("/subscriptions") ||
        pathname.startsWith("/inventory") ||
        pathname.startsWith("/purchase") ||
        pathname.startsWith("/logistics") ||
        pathname.startsWith("/accounting") ||
        pathname.startsWith("/hr") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/manufacturing") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/settings");
      if (isAppRoute) return !!auth;
      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
