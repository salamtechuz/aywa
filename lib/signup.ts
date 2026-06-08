import "server-only";

import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { EMAIL_FROM, getResend, isEmailEnabled } from "@/lib/email/resend";
import { recordMovement } from "@/lib/inventory/stock";

const SLUG_RE = /[^a-z0-9]+/g;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(SLUG_RE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const seed = slugify(base) || "workspace";
  let candidate = seed;
  for (let i = 0; i < 50; i++) {
    const taken = await db.workspace.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
    candidate = `${seed}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  // Final fallback: cuid suffix.
  return `${seed}-${Date.now().toString(36)}`;
}

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
};

export type SignupResult =
  | { ok: true; userId: string; workspaceSlug: string }
  | { ok: false; error: string };

/**
 * Create a User + their first Workspace + OWNER Membership in one transaction.
 * Returns the workspace slug so the caller can redirect into it.
 */
export async function createUserWithWorkspace(
  input: SignupInput,
): Promise<SignupResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!email.includes("@")) return { ok: false, error: "Invalid email" };
  if (name.length < 1) return { ok: false, error: "Name is required" };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "An account with this email already exists" };

  const passwordHash = await bcrypt.hash(password, 10);

  const wsName =
    input.workspaceName?.trim() ||
    `${name.split(" ")[0] || "My"}'s workspace`;
  const slug = await uniqueSlug(wsName);

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash },
    });
    const workspace = await tx.workspace.create({
      data: { name: wsName, slug, plan: "FREE" },
    });
    await tx.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
    });
    return { user, workspace };
  });

  // Best-effort sample data seed + welcome email. We don't roll back the
  // workspace creation if either fails — the user gets an empty workspace and
  // a console warning.
  try {
    await seedSampleWorkspace(result.workspace.id, name);
  } catch (err) {
    console.warn("[signup] sample seed failed:", err);
  }

  if (isEmailEnabled()) {
    void sendWelcomeEmail(email, name, result.workspace.slug).catch((err) => {
      console.warn("[signup] welcome email failed:", err);
    });
  }

  return {
    ok: true,
    userId: result.user.id,
    workspaceSlug: result.workspace.slug,
  };
}

/**
 * Populates a fresh workspace with a small but believable dataset so the new
 * user has something to click on instead of an empty shell. Every record is
 * tagged with "[example]" in notes so the Settings page can offer a one-click
 * Clear sample data action.
 */
async function seedSampleWorkspace(workspaceId: string, ownerName: string) {
  const firstName = ownerName.split(" ")[0] || "you";
  const EXAMPLE_TAG = "[example] Auto-generated sample, safe to delete.";

  const [productA, productB, productC, productD, productE] = await Promise.all([
    db.product.create({
      data: {
        workspaceId,
        sku: "WIDGET-100",
        name: "Premium Widget",
        category: "Hardware",
        unit: "each",
        price: 49.99,
        cost: 22,
        stockOnHand: 0,
        reorderAt: 20,
        description: EXAMPLE_TAG,
      },
    }),
    db.product.create({
      data: {
        workspaceId,
        sku: "GIZMO-200",
        name: "Gizmo Pro",
        category: "Hardware",
        unit: "each",
        price: 129,
        cost: 58,
        stockOnHand: 0,
        reorderAt: 10,
        description: EXAMPLE_TAG,
      },
    }),
    db.product.create({
      data: {
        workspaceId,
        sku: "SVC-IMPL",
        name: "Implementation services",
        category: "Services",
        unit: "hour",
        price: 180,
        cost: 90,
        stockOnHand: 0,
        reorderAt: 0,
        description: EXAMPLE_TAG,
      },
    }),
    db.product.create({
      data: {
        workspaceId,
        sku: "SAAS-TEAM",
        name: "SaaS team license",
        category: "Licenses",
        unit: "license",
        price: 49,
        cost: 0,
        stockOnHand: 0,
        reorderAt: 0,
        description: EXAMPLE_TAG,
      },
    }),
    db.product.create({
      data: {
        workspaceId,
        sku: "CABLE-USB",
        name: "USB-C cable, 2m",
        category: "Accessories",
        unit: "each",
        price: 19,
        cost: 6,
        stockOnHand: 0,
        reorderAt: 50,
        description: EXAMPLE_TAG,
      },
    }),
  ]);

  // Seed inventory via the movement ledger so onHand math is consistent with
  // the rest of the app (no "phantom" stockOnHand without movement history).
  for (const [prod, qty] of [
    [productA, 60],
    [productB, 25],
    [productE, 200],
  ] as const) {
    await recordMovement({
      workspaceId,
      productId: prod.id,
      type: "INITIAL",
      quantity: qty,
      reason: "Sample opening stock",
      sourceType: "INITIAL_LOAD",
    });
  }

  const [contactA, contactB, contactC] = await Promise.all([
    db.contact.create({
      data: {
        workspaceId,
        name: "Riley Chen",
        email: "riley@northwind.example",
        phone: "+1 (415) 555-0118",
        company: "Northwind Traders",
        type: "COMPANY",
      },
    }),
    db.contact.create({
      data: {
        workspaceId,
        name: "Sam Patel",
        email: "sam@globex.example",
        phone: "+1 (212) 555-0210",
        company: "Globex Industries",
        type: "COMPANY",
      },
    }),
    db.contact.create({
      data: {
        workspaceId,
        name: "Avery Okafor",
        email: "avery@example.com",
        phone: "+1 (305) 555-0345",
        company: null,
        type: "PERSON",
      },
    }),
  ]);

  // Two deals: one lead, one mid-funnel.
  await db.deal.create({
    data: {
      workspaceId,
      name: "Northwind — 50 widgets pilot",
      kind: "OPPORTUNITY",
      stage: "PROPOSAL",
      value: 4250,
      probability: 60,
      contactId: contactA.id,
      ownerName: firstName,
      expectedCloseDate: new Date(Date.now() + 14 * 86_400_000),
      notes: EXAMPLE_TAG,
    },
  });
  await db.deal.create({
    data: {
      workspaceId,
      name: "Globex — SaaS team licenses",
      kind: "LEAD",
      stage: "NEW",
      value: 2940,
      probability: 20,
      contactId: contactB.id,
      ownerName: firstName,
      notes: EXAMPLE_TAG,
    },
  });

  // A sample sales order in DRAFT — gives the user something to PDF + Send.
  const order = await db.salesOrder.create({
    data: {
      workspaceId,
      number: "SO-0001",
      customerId: contactA.id,
      status: "DRAFT",
      amount: 0,
      ownerName: firstName,
      expectedDate: new Date(Date.now() + 10 * 86_400_000),
      notes: EXAMPLE_TAG,
    },
  });
  await db.salesOrderLine.create({
    data: {
      orderId: order.id,
      productId: productA.id,
      description: productA.name,
      quantity: 50,
      unitPrice: productA.price,
      discount: 0,
      position: 0,
    },
  });
  await db.salesOrderLine.create({
    data: {
      orderId: order.id,
      productId: productC.id,
      description: "Implementation services",
      quantity: 8,
      unitPrice: productC.price,
      discount: 10,
      position: 1,
    },
  });
  const lineTotal =
    50 * productA.price + 8 * productC.price - 8 * productC.price * 0.1;
  await db.salesOrder.update({
    where: { id: order.id },
    data: { amount: lineTotal },
  });

  // A sample vendor + a draft PO.
  const vendor = await db.vendor.create({
    data: {
      workspaceId,
      name: "Pacific Components Co.",
      vendorCode: "V-001",
      email: "sales@pacificcomp.example",
      contactPerson: "Hana Suzuki",
      paymentTerms: "Net 30",
      currency: "USD",
      notes: EXAMPLE_TAG,
    },
  });
  const po = await db.purchaseOrder.create({
    data: {
      workspaceId,
      number: "PO-0001",
      vendorId: vendor.id,
      status: "DRAFT",
      amount: 0,
      ownerName: firstName,
      expectedDate: new Date(Date.now() + 21 * 86_400_000),
      notes: EXAMPLE_TAG,
    },
  });
  await db.purchaseOrderLine.create({
    data: {
      orderId: po.id,
      productId: productB.id,
      description: productB.name,
      quantity: 30,
      unitCost: productB.cost,
      position: 0,
    },
  });
  await db.purchaseOrder.update({
    where: { id: po.id },
    data: { amount: 30 * productB.cost },
  });
}

async function sendWelcomeEmail(
  email: string,
  name: string,
  workspaceSlug: string,
) {
  const resend = await getResend();
  if (!resend) return;
  const firstName = name.split(" ")[0] || "there";
  await resend.emails.send({
    from: EMAIL_FROM,
    to: [email],
    subject: `Welcome to aywa, ${firstName} 👋`,
    text: [
      `Hi ${firstName},`,
      "",
      `Your aywa workspace ${workspaceSlug} is ready. Here's where to start:`,
      "",
      "• Dashboard — your KPIs and what needs attention today",
      "• CRM — drag deals through the pipeline; click any card for AI summary",
      "• Sales — turn quotes into PDFs and email them with one click",
      "• Inventory — sales orders auto-decrement stock on delivery",
      "",
      "We seeded your workspace with a few example records so you can click around immediately.",
      "Once you're comfortable, head to Settings → General and clear the sample data.",
      "",
      "— the aywa team",
    ].join("\n"),
  });
}

export async function verifyUserPassword(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string | null; image: string | null } | null> {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
