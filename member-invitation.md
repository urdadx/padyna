// ACCEPT INVITATION
import { db } from "@/db";
import {
chatbot,
invitation,
member,
organization,
session as sessionTable,
user,
} from "@/db/schema";
import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { auth } from "auth";
import { and, eq } from "drizzle-orm";

export const ServerRoute = createServerFileRoute(
"/api/accept-invitation/$invitationId",
).methods({
GET: async ({ request, params }) => {
const { invitationId } = params;

    if (!invitationId) {
      return json({ error: "Invitation ID is required" }, { status: 400 });
    }

    try {
      // Fetch the invitation details
      const [invitationData] = await db
        .select()
        .from(invitation)
        .where(eq(invitation.id, invitationId))
        .limit(1);

      if (!invitationData) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/invitation-error?type=invalid",
          },
        });
      }

      // Check if invitation is expired
      if (new Date() > invitationData.expiresAt) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/invitation-error?type=expired",
          },
        });
      }

      // Check if invitation is already accepted
      if (invitationData.status === "accepted") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/invitation-error?type=accepted",
          },
        });
      }

      // Check if user is authenticated
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      // If user is not logged in, redirect to setup with invitation details
      if (!session) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/setup?invitationId=${invitationId}&email=${encodeURIComponent(invitationData.email)}`,
          },
        });
      }

      // User is logged in - verify email matches invitation
      if (session.user.email !== invitationData.email) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/invitation-error?type=mismatch&message=${encodeURIComponent(`You are logged in as ${session.user.email}, but this invitation was sent to ${invitationData.email}`)}`,
          },
        });
      }

      // Check if user is already a member of this organization
      const [existingMember] = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, invitationData.organizationId),
          ),
        )
        .limit(1);

      if (existingMember) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/invitation-already-member",
          },
        });
      }

      // Accept the invitation using better-auth
      await auth.api.acceptInvitation({
        body: {
          invitationId,
        },
        headers: request.headers,
      });

      // Mark user's email as verified and subscribed (inheriting from organization)
      await db
        .update(user)
        .set({
          emailVerified: true,
          isSubscribed: true,
        })
        .where(eq(user.id, session.user.id));

      // Get the organization's chatbot for the session
      const [orgChatbot] = await db
        .select()
        .from(chatbot)
        .where(eq(chatbot.organizationId, invitationData.organizationId))
        .limit(1);

      // Update the user's session with the organization and chatbot IDs
      // This prevents them from being redirected to onboarding
      await db
        .update(sessionTable)
        .set({
          activeOrganizationId: invitationData.organizationId,
          activeChatbotId: orgChatbot?.id || null,
          updatedAt: new Date(),
        })
        .where(eq(sessionTable.userId, session.user.id));

      // Get organization name for success message
      const [org] = await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, invitationData.organizationId))
        .limit(1);

      console.log(
        `✅ Updated session for user ${session.user.id} with organization ${invitationData.organizationId}`,
      );

      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/invitation-success?organizationName=${encodeURIComponent(org?.name || "")}`,
        },
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      return json(
        {
          error: "An error occurred while accepting the invitation",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

},
});

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Spinner from "@/components/ui/spinner";
import { useMutation } from "@tanstack/react-query";
import {
createFileRoute,
useSearch,
} from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import z from "zod";

export const Route = createFileRoute("/accept-invitation")({
component: RouteComponent,
validateSearch: z.object({
invitationId: z.string(),
}),
});

function RouteComponent() {
const { invitationId } = useSearch({
from: "/accept-invitation",
});

const acceptInvitationMutation = useMutation({
mutationFn: async () => {
// Redirect to the API endpoint which handles all the logic
window.location.href = `/api/accept-invitation/${invitationId}`;
return { success: true };
},
onError: (error) => {
toast.error(error.message);
},
});

const handleAcceptInvitation = () => {
acceptInvitationMutation.mutate();
};

return (
<>

<main className="relative min-h-screen w-full bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] before:absolute before:-z-10 before:inset-0 before:bg-[radial-gradient(circle_at_left,rgba(251,146,60,0.05),rgba(139,92,246,0.05),transparent_50%)] after:absolute after:-z-10 after:inset-0 after:bg-[radial-gradient(circle_at_right,rgba(251,146,60,0.05),rgba(139,92,246,0.05),transparent_50%)]">
<div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
<Card className="w-full max-w-md bg-white ">
<CardContent className="p-6 sm:p-8 text-center">
<div className="relative mb-6 sm:mb-8">
<div className="relative mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
<Mail className="w-8 h-8 text-white stroke-[3]" />
</div>
</div>
<h1 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
Click to accept your invitation
</h1>
<p className="text-gray-500 text-sm mb-6 sm:mb-8 leading-relaxed">
Click the button below to accept your invitation
</p>
<div className="flex flex-col gap-3">
<motion.div
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }} >
<Button
                    onClick={handleAcceptInvitation}
                    disabled={acceptInvitationMutation.isPending}
                    className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                  >
{acceptInvitationMutation.isPending ? (
<>
<Spinner className="text-white" />
Accepting...
</>
) : (
"Accept Invitation"
)}
</Button>
</motion.div>
</div>
</CardContent>
</Card>
</div>
</main>
</>
);
}

// SEND INVITATION
import { db } from "@/db";
import { member } from "@/db/schema";
import { isUserMemberOfOrganization } from "@/lib/ai/chat-functions";
import { checkMemberInvitationLimits } from "@/lib/subscription/subscription-utils";
import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { count, eq } from "drizzle-orm";
import z from "zod";
import { auth } from "../../../auth";

const inviteMemberSchema = z.object({
email: z.email("Invalid email address"),
role: z.enum(["member", "owner"], {
message: "Role must be either 'member' or 'owner'",
}),
});

export const ServerRoute = createServerFileRoute("/api/invite-member").methods({
POST: async ({ request }) => {
try {
const session = await auth.api.getSession({ headers: request.headers });
const userId = session?.user?.id;
const organizationId = session?.session?.activeOrganizationId;

      if (!userId || !organizationId) {
        return json(
          { message: "Unauthorized: Please log in" },
          { status: 401 },
        );
      }

      const isMember = await isUserMemberOfOrganization(userId, organizationId);
      if (!isMember) {
        return json({ message: "Forbidden" }, { status: 403 });
      }

      // Get current user's role to check if they can invite
      const [currentMember] = await db
        .select({ role: member.role })
        .from(member)
        .where(
          eq(member.userId, userId) &&
            eq(member.organizationId, organizationId),
        );

      if (
        !currentMember ||
        (currentMember.role !== "owner" && currentMember.role !== "admin")
      ) {
        return json(
          { message: "Only owners and admins can invite members" },
          { status: 403 },
        );
      }

      const body = await request.json();
      const parseResult = inviteMemberSchema.safeParse(body);

      if (!parseResult.success) {
        return json(
          {
            message: "Invalid request data",
            details: parseResult.error.issues,
          },
          { status: 400 },
        );
      }

      const { email, role } = parseResult.data;

      const [memberCountResult] = await db
        .select({ count: count(member.id) })
        .from(member)
        .where(eq(member.organizationId, organizationId));

      const currentMemberCount = memberCountResult?.count || 0;

      const limitCheck = await checkMemberInvitationLimits(
        organizationId,
        currentMemberCount,
      );

      if (!limitCheck.canInvite) {
        const statusCode = limitCheck.reason === "limit_reached" ? 402 : 400;
        return json(
          {
            message: limitCheck.message,
            reason: limitCheck.reason,
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
          },
          { status: statusCode },
        );
      }

      const invitationData = await auth.api.createInvitation({
        body: {
          email,
          role,
          organizationId,
          resend: true,
        },
        headers: request.headers,
      });

      if (!invitationData || !invitationData.id) {
        return json(
          {
            message: "Failed to create invitation",
          },
          { status: 400 },
        );
      }

      return json({
        success: true,
        message: `Invitation sent to ${email}`,
        invitation: invitationData,
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      return json({ message: "Internal server error" }, { status: 500 });
    }

},
});
