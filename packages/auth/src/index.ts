import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization, oAuthProxy } from "better-auth/plugins";
import { Resend } from "resend";

import { db } from "@acme/db/client";

// System roles (stored in user.role field)
// - user: clients who use web app (org owners/collaborators)
// - admin: system admins who manage presentations in admin app
// - superadmin: can manage presentations + all users in admin app
export const SYSTEM_ROLES = ["user", "admin", "superadmin"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export function initAuth<TExtraPlugins extends BetterAuthPlugin[] = []>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  resendApiKey: string;
  // Google OAuth (uncomment when ready)
  // googleClientId?: string;
  // googleClientSecret?: string;
  extraPlugins?: TExtraPlugins;
}) {
  const resend = new Resend(options.resendApiKey);

  // Email sender helper
  // TODO: Remove hardcoded email after verifying a domain in Resend
  const TEST_EMAIL = "512juanm@gmail.com"; // Resend test mode only sends here
  const sendEmail = async (to: string, subject: string, html: string) => {
    await resend.emails.send({
      from: "GSP <onboarding@resend.dev>", // Test mode - change when you have verified domain
      to: TEST_EMAIL, // Hardcoded for testing with resend.dev domain
      subject: `[Para: ${to}] ${subject}`, // Include real recipient in subject for clarity
      html,
    });
  };

  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,

    // Email/Password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(
          user.email,
          "Restablecer contraseña - GSP",
          `
          <h2>Restablecer contraseña</h2>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <p><a href="${url}">Restablecer contraseña</a></p>
          <p>Si no solicitaste esto, ignora este email.</p>
          `,
        );
      },
    },

    // Email verification
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(
          user.email,
          "Verifica tu email - GSP",
          `
          <h2>Bienvenido a GSP</h2>
          <p>Haz clic en el siguiente enlace para verificar tu email:</p>
          <p><a href="${url}">Verificar email</a></p>
          `,
        );
      },
    },

    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),

      // Organization plugin - for user role (clients)
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 5,
        membershipLimit: 50,
        invitationExpiresIn: 60 * 60 * 48, // 48 hours
        sendInvitationEmail: async (data) => {
          const inviteLink = `${options.baseUrl}/invitations/${data.id}`;
          await sendEmail(
            data.email,
            `Invitación a ${data.organization.name} - GSP`,
            `
            <h2>Has sido invitado</h2>
            <p>Has sido invitado a unirte a <strong>${data.organization.name}</strong> en GSP.</p>
            <p><a href="${inviteLink}">Aceptar invitación</a></p>
            <p>Esta invitación expira en 48 horas.</p>
            `,
          );
        },
      }),

      // Admin plugin - adds role field to user table
      // Roles: user (default), admin, superadmin
      admin({
        defaultRole: "user",
        adminRoles: ["superadmin", "admin"],
      }),

      ...(options.extraPlugins ?? []),
    ],

    // Social providers (uncomment when ready)
    // socialProviders: {
    //   google: options.googleClientId ? {
    //     clientId: options.googleClientId,
    //     clientSecret: options.googleClientSecret!,
    //     redirectURI: `${options.productionUrl}/api/auth/callback/google`,
    //   } : undefined,
    // },

    trustedOrigins: ["expo://"],

    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
        // console.log()
        // console.log()
        // console.log("error json", JSON.stringify(error));
        // console.log()
        // console.log()
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
