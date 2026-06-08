import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const WORKSPACE = "ws_acme";

// --- date helpers ---------------------------------------------------------
const DAY = 86_400_000;
/** Date relative to "now" by a day offset (negative = past). */
const rel = (days: number) => new Date(Date.now() + days * DAY);
/** Absolute date from an ISO string. */
const at = (iso: string) => new Date(iso);

// --- shared reference data ------------------------------------------------
const CONTACTS = [
  { name: "Sarah Chen", email: "sarah.chen@northwind.test", company: "Northwind Traders" },
  { name: "Marcus Lee", email: "marcus@globex.test", company: "Globex Corporation" },
  { name: "Priya Sharma", email: "priya@initech.test", company: "Initech" },
  { name: "Diego Alvarez", email: "diego@umbrella.test", company: "Umbrella Co" },
  { name: "Hannah Park", email: "hannah@hooli.test", company: "Hooli" },
  { name: "Tom Reyes", email: "tom@piedpiper.test", company: "Pied Piper" },
  { name: "Yuki Tanaka", email: "yuki@stark.test", company: "Stark Industries" },
  { name: "Olivia Brown", email: "olivia@wonka.test", company: "Wonka Industries" },
];

type Seed = {
  contact: string;
  name: string;
  value: number;
  stage: "NEW" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
  daysOut: number;
  owner: string;
};

const OWNERS = [
  { name: "Alex Rivera", email: "alex@aywa.test" },
  { name: "Mia Johnson", email: "mia@aywa.test" },
  { name: "Sam Patel", email: "sam@aywa.test" },
];

const DEALS: Seed[] = [
  { contact: "Northwind Traders", name: "Annual platform license", value: 48000, stage: "NEW", daysOut: 60, owner: "alex@aywa.test" },
  { contact: "Globex Corporation", name: "EU expansion add-on", value: 22000, stage: "NEW", daysOut: 45, owner: "mia@aywa.test" },
  { contact: "Initech", name: "Onboarding + training", value: 9500, stage: "NEW", daysOut: 30, owner: "sam@aywa.test" },

  { contact: "Umbrella Co", name: "Q2 renewal", value: 36000, stage: "QUALIFIED", daysOut: 28, owner: "alex@aywa.test" },
  { contact: "Hooli", name: "Multi-region rollout", value: 84000, stage: "QUALIFIED", daysOut: 50, owner: "mia@aywa.test" },

  { contact: "Pied Piper", name: "Enterprise tier upgrade", value: 64000, stage: "PROPOSAL", daysOut: 21, owner: "alex@aywa.test" },
  { contact: "Stark Industries", name: "Custom integrations", value: 120000, stage: "PROPOSAL", daysOut: 18, owner: "sam@aywa.test" },

  { contact: "Wonka Industries", name: "Pilot expansion", value: 18000, stage: "NEGOTIATION", daysOut: 7, owner: "mia@aywa.test" },
  { contact: "Initech", name: "Premium support contract", value: 24000, stage: "NEGOTIATION", daysOut: 10, owner: "alex@aywa.test" },

  { contact: "Northwind Traders", name: "Q1 renewal — signed", value: 36000, stage: "WON", daysOut: -3, owner: "alex@aywa.test" },
  { contact: "Hooli", name: "Pilot — signed", value: 12000, stage: "WON", daysOut: -10, owner: "mia@aywa.test" },

  { contact: "Globex Corporation", name: "RFQ — lost to incumbent", value: 28000, stage: "LOST", daysOut: -14, owner: "sam@aywa.test" },
];

const STAGE_PROB: Record<Seed["stage"], number> = {
  NEW: 10,
  QUALIFIED: 30,
  PROPOSAL: 55,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

async function main() {
  // -----------------------------------------------------------------------
  // CLEANUP (FK-safe order: children before parents). Scoped to WORKSPACE so
  // re-running `npm run seed` is idempotent and never duplicates rows.
  // -----------------------------------------------------------------------
  console.log("→ Clearing workspace data");
  await db.timeOffRequest.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.employee.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.task.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.project.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.subscription.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.stockMovement.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.purchaseOrderLine.deleteMany({ where: { order: { workspaceId: WORKSPACE } } });
  await db.purchaseOrder.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.vendor.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.emailEvent.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.auditLog.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.invitation.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.membership.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.activity.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.dealTag.deleteMany({ where: { tag: { workspaceId: WORKSPACE } } });
  await db.tag.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.salesOrderLine.deleteMany({ where: { order: { workspaceId: WORKSPACE } } });
  await db.salesOrder.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.deal.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.contact.deleteMany({ where: { workspaceId: WORKSPACE } });
  // Manufacturing rows reference products (Restrict) — clear them before products.
  await db.manufacturingOrder.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.bomComponent.deleteMany({ where: { bom: { workspaceId: WORKSPACE } } });
  await db.bom.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.product.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.journalEntryLine.deleteMany({ where: { entry: { workspaceId: WORKSPACE } } });
  await db.journalEntry.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.ledgerAccount.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.journal.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.vehiclePosition.deleteMany({ where: { workspaceId: WORKSPACE } });
  await db.vehicle.deleteMany({ where: { workspaceId: WORKSPACE } });

  // deferred updatedAt back-dating (for time-bucketed charts + stale-deal inbox)
  const updatedAtFixes: { table: "Deal" | "SalesOrder"; id: string; ts: Date }[] = [];

  // -----------------------------------------------------------------------
  // CONTACTS
  // -----------------------------------------------------------------------
  console.log("→ Seeding contacts");
  const contactByCompany = new Map<string, string>();
  for (const c of CONTACTS) {
    const created = await db.contact.create({
      data: { workspaceId: WORKSPACE, name: c.name, email: c.email, company: c.company, type: "PERSON" },
    });
    contactByCompany.set(c.company, created.id);
  }

  // -----------------------------------------------------------------------
  // TAGS
  // -----------------------------------------------------------------------
  console.log("→ Seeding tags");
  const TAGS = [
    { name: "Enterprise", color: "violet" },
    { name: "SMB", color: "sky" },
    { name: "Upsell", color: "emerald" },
    { name: "Renewal", color: "amber" },
    { name: "Hot", color: "red" },
  ];
  const tagByName = new Map<string, string>();
  for (const t of TAGS) {
    const created = await db.tag.create({ data: { workspaceId: WORKSPACE, name: t.name, color: t.color } });
    tagByName.set(t.name, created.id);
  }

  // -----------------------------------------------------------------------
  // DEALS (curated pipeline)
  // -----------------------------------------------------------------------
  console.log("→ Seeding deals");
  const stagePositions: Record<string, number> = {};
  const dealsCreated: { id: string; name: string; stage: string; contact: string }[] = [];
  const dealByName = new Map<string, string>();
  for (const [i, d] of DEALS.entries()) {
    const owner = OWNERS.find((o) => o.email === d.owner)!;
    const expectedCloseDate = rel(d.daysOut);
    const position = stagePositions[d.stage] ?? 0;
    stagePositions[d.stage] = position + 1;
    const kind = d.stage === "NEW" && i < 2 ? "LEAD" : "OPPORTUNITY";

    const created = await db.deal.create({
      data: {
        workspaceId: WORKSPACE,
        name: d.name,
        kind,
        value: d.value,
        currency: "USD",
        stage: d.stage,
        probability: STAGE_PROB[d.stage],
        expectedCloseDate,
        ownerName: owner.name,
        ownerEmail: owner.email,
        position,
        contactId: contactByCompany.get(d.contact),
      },
    });
    dealsCreated.push({ id: created.id, name: created.name, stage: d.stage, contact: d.contact });
    dealByName.set(created.name, created.id);
  }

  // -----------------------------------------------------------------------
  // DEALS — back-dated WON + LOST (fuel revenue-trend, win/loss, top customers)
  // updatedAt is back-dated so RevenueTrend buckets them across 12 months.
  // -----------------------------------------------------------------------
  console.log("→ Seeding historical won/lost deals");
  const HISTORIC_DEALS: {
    name: string; contact: string; stage: "WON" | "LOST"; value: number;
    owner: string; ownerEmail: string; updated: string; created: string; close?: string;
  }[] = [
    { name: "Northwind — annual renewal (signed)", contact: "Northwind Traders", stage: "WON", value: 36000, owner: "Alex Rivera", ownerEmail: "alex@aywa.test", updated: "2025-07-12", created: "2025-06-20", close: "2025-07-10" },
    { name: "Hooli — pilot (signed)", contact: "Hooli", stage: "WON", value: 12000, owner: "Mia Johnson", ownerEmail: "mia@aywa.test", updated: "2025-08-05", created: "2025-07-01", close: "2025-08-01" },
    { name: "Initech — onboarding bundle (won)", contact: "Initech", stage: "WON", value: 18500, owner: "Sam Patel", ownerEmail: "sam@aywa.test", updated: "2025-09-18", created: "2025-08-10", close: "2025-09-15" },
    { name: "Umbrella — Q4 expansion (won)", contact: "Umbrella Co", stage: "WON", value: 42000, owner: "Alex Rivera", ownerEmail: "alex@aywa.test", updated: "2025-10-22", created: "2025-09-05", close: "2025-10-20" },
    { name: "Stark — integration deal (won)", contact: "Stark Industries", stage: "WON", value: 60000, owner: "Sam Patel", ownerEmail: "sam@aywa.test", updated: "2025-11-14", created: "2025-10-01", close: "2025-11-10" },
    { name: "Globex — EU rollout phase 1 (won)", contact: "Globex Corporation", stage: "WON", value: 28000, owner: "Mia Johnson", ownerEmail: "mia@aywa.test", updated: "2025-12-09", created: "2025-11-01", close: "2025-12-05" },
    { name: "Pied Piper — platform upgrade (won)", contact: "Pied Piper", stage: "WON", value: 24000, owner: "Alex Rivera", ownerEmail: "alex@aywa.test", updated: "2026-01-16", created: "2025-12-10", close: "2026-01-12" },
    { name: "Wonka — multi-seat (won)", contact: "Wonka Industries", stage: "WON", value: 15000, owner: "Mia Johnson", ownerEmail: "mia@aywa.test", updated: "2026-02-11", created: "2026-01-05", close: "2026-02-08" },
    { name: "Northwind — add-on pack (won)", contact: "Northwind Traders", stage: "WON", value: 9600, owner: "Alex Rivera", ownerEmail: "alex@aywa.test", updated: "2026-03-20", created: "2026-02-15", close: "2026-03-18" },
    { name: "Hooli — enterprise tier (won)", contact: "Hooli", stage: "WON", value: 60000, owner: "Mia Johnson", ownerEmail: "mia@aywa.test", updated: "2026-04-09", created: "2026-03-01", close: "2026-04-05" },
    { name: "Initech — premium support (won)", contact: "Initech", stage: "WON", value: 24000, owner: "Sam Patel", ownerEmail: "sam@aywa.test", updated: "2026-05-15", created: "2026-04-10", close: "2026-05-12" },
    { name: "Stark — Q2 renewal (won)", contact: "Stark Industries", stage: "WON", value: 48000, owner: "Alex Rivera", ownerEmail: "alex@aywa.test", updated: "2026-06-02", created: "2026-05-01", close: "2026-06-01" },
    { name: "Globex — RFQ lost to incumbent", contact: "Globex Corporation", stage: "LOST", value: 28000, owner: "Sam Patel", ownerEmail: "sam@aywa.test", updated: "2026-03-12", created: "2026-01-20" },
    { name: "Umbrella — churned to competitor", contact: "Umbrella Co", stage: "LOST", value: 16000, owner: "Mia Johnson", ownerEmail: "mia@aywa.test", updated: "2026-04-25", created: "2026-02-15" },
    { name: "Pied Piper — budget cut (lost)", contact: "Pied Piper", stage: "LOST", value: 32000, owner: "Sam Patel", ownerEmail: "sam@aywa.test", updated: "2026-05-08", created: "2026-03-10" },
  ];
  let histPos = 50;
  for (const d of HISTORIC_DEALS) {
    const created = await db.deal.create({
      data: {
        workspaceId: WORKSPACE,
        name: d.name,
        kind: "OPPORTUNITY",
        value: d.value,
        currency: "USD",
        stage: d.stage,
        probability: d.stage === "WON" ? 100 : 0,
        expectedCloseDate: d.close ? at(d.close) : null,
        ownerName: d.owner,
        ownerEmail: d.ownerEmail,
        position: histPos++,
        contactId: contactByCompany.get(d.contact),
        createdAt: at(d.created),
      },
    });
    updatedAtFixes.push({ table: "Deal", id: created.id, ts: at(d.updated) });
  }

  // -----------------------------------------------------------------------
  // ACTIVITIES (deal timelines)
  // -----------------------------------------------------------------------
  console.log("→ Seeding activities");
  const ACTIVITY_PATTERNS = [
    { offset: -7, type: "EMAIL", title: "Sent intro deck", body: "Shared overview + pricing. Awaiting response." },
    { offset: -4, type: "CALL", title: "Discovery call (45 min)", body: "Discussed pain points and current vendor. Strong fit on workflow + integrations." },
    { offset: -2, type: "NOTE", title: "Champion identified", body: "Director of Ops is internal champion. CFO is decision-maker." },
    { offset: 2, type: "MEETING", title: "Demo with leadership", body: null },
    { offset: 5, type: "TASK", title: "Send updated proposal", body: "Include revised pricing for multi-year." },
  ];
  for (const d of dealsCreated) {
    if (d.stage === "LOST" || d.stage === "WON") continue;
    const picks = [ACTIVITY_PATTERNS[0], ACTIVITY_PATTERNS[1], ACTIVITY_PATTERNS[3]];
    for (const a of picks) {
      const when = rel(a.offset);
      await db.activity.create({
        data: {
          workspaceId: WORKSPACE,
          dealId: d.id,
          type: a.type,
          title: a.title,
          body: a.body,
          dueAt: a.offset > 0 ? when : null,
          doneAt: a.offset <= 0 ? when : null,
          createdAt: a.offset <= 0 ? when : new Date(),
          ownerName: "Alex Rivera",
        },
      });
    }
  }

  // Inbox/Calendar driver activities (overdue / today / upcoming / done-with-due).
  console.log("→ Seeding inbox/calendar activities");
  const INBOX_ACTIVITIES = [
    { type: "TASK", title: "Follow up on overdue proposal", dueAt: rel(-3), doneAt: null, owner: "Alex Rivera" },
    { type: "CALL", title: "Check-in call with Hooli", dueAt: rel(0), doneAt: null, owner: "Mia Johnson" },
    { type: "MEETING", title: "Demo with Stark leadership", dueAt: rel(4), doneAt: null, owner: "Sam Patel" },
    { type: "EMAIL", title: "Sent recap email", dueAt: rel(-2), doneAt: rel(-2), owner: "Alex Rivera" },
  ];
  for (const a of INBOX_ACTIVITIES) {
    await db.activity.create({
      data: {
        workspaceId: WORKSPACE,
        type: a.type,
        title: a.title,
        dueAt: a.dueAt,
        doneAt: a.doneAt,
        ownerName: a.owner,
        createdAt: rel(-5),
      },
    });
  }

  // Inbox driver deals: one closing-this-week, one stale (no activity in 14d+).
  const closingDeal = await db.deal.create({
    data: {
      workspaceId: WORKSPACE, name: "Wonka Industries Q3 (closing this week)", kind: "OPPORTUNITY",
      stage: "NEGOTIATION", value: 31000, currency: "USD", probability: 75,
      expectedCloseDate: rel(4), ownerName: "Mia Johnson", ownerEmail: "mia@aywa.test",
      position: 90, contactId: contactByCompany.get("Wonka Industries"),
    },
  });
  void closingDeal;
  const staleDeal = await db.deal.create({
    data: {
      workspaceId: WORKSPACE, name: "Umbrella Co expansion (stale)", kind: "OPPORTUNITY",
      stage: "QUALIFIED", value: 42000, currency: "USD", probability: 30,
      expectedCloseDate: rel(35), ownerName: "Alex Rivera", ownerEmail: "alex@aywa.test",
      position: 91, contactId: contactByCompany.get("Umbrella Co"),
    },
  });
  updatedAtFixes.push({ table: "Deal", id: staleDeal.id, ts: rel(-22) });

  // -----------------------------------------------------------------------
  // PRODUCTS — software/services (digital: no physical stock, never low-stock)
  // -----------------------------------------------------------------------
  console.log("→ Seeding products");
  const PRODUCTS = [
    { sku: "PLT-CORE", name: "aywa Platform — Core", category: "Software", unit: "license", price: 12000, cost: 2000 },
    { sku: "PLT-PRO", name: "aywa Platform — Pro", category: "Software", unit: "license", price: 24000, cost: 3000 },
    { sku: "PLT-ENT", name: "aywa Platform — Enterprise", category: "Software", unit: "license", price: 60000, cost: 5000 },
    { sku: "ADD-SSO", name: "SSO + SCIM add-on", category: "Add-on", unit: "license", price: 4800, cost: 400 },
    { sku: "ADD-AUDIT", name: "Audit log add-on", category: "Add-on", unit: "license", price: 3600, cost: 300 },
    { sku: "SVC-IMPL", name: "Implementation services", category: "Services", unit: "hour", price: 240, cost: 120 },
    { sku: "SVC-TRAIN", name: "Onboarding & training", category: "Services", unit: "hour", price: 180, cost: 90 },
    { sku: "SUP-PREM", name: "Premium support — annual", category: "Support", unit: "license", price: 9600, cost: 600 },
    { sku: "INT-CRM", name: "Salesforce sync integration", category: "Integration", unit: "license", price: 6000, cost: 600 },
    { sku: "INT-ERP", name: "NetSuite sync integration", category: "Integration", unit: "license", price: 7200, cost: 600 },
  ];
  const productBySku = new Map<string, { id: string; price: number; name: string }>();
  for (const p of PRODUCTS) {
    const created = await db.product.create({
      data: {
        workspaceId: WORKSPACE, sku: p.sku, name: p.name, category: p.category, unit: p.unit,
        price: p.price, cost: p.cost, stockOnHand: 0,
        // Digital goods are not stock-managed → reorderAt 0 keeps them off the low-stock alert.
        reorderAt: 0,
      },
    });
    productBySku.set(p.sku, { id: created.id, price: p.price, name: p.name });
  }

  // Physical goods — real inventory story (ledger-backed on-hand, mixed low-stock).
  console.log("→ Seeding physical products + stock ledger");
  const PHYSICAL = [
    { sku: "HW-LAPTOP-14", name: "Fieldbook 14 Laptop", category: "Hardware", price: 1450, cost: 980, reorderAt: 15, active: true,
      moves: [["INITIAL", 50, "Opening inventory count", "INITIAL_LOAD", null, 90], ["IN", 24, "Purchase order line: Fieldbook 14 Laptop", "PURCHASE_ORDER", "Sam Patel", 40], ["OUT", -20, "Q1 new-hire deployment", "SALES_ORDER", "Mia Johnson", 28], ["OUT", -14, "Onboarding kit fulfillment", "SALES_ORDER", "Alex Rivera", 9], ["ADJUSTMENT", 2, "Cycle count correction", "MANUAL", "Sam Patel", 2]] },
    { sku: "HW-DOCK-USB4", name: "USB4 Docking Station", category: "Hardware", price: 320, cost: 240, reorderAt: 25, active: true,
      moves: [["INITIAL", 30, "Opening inventory count", "INITIAL_LOAD", null, 90], ["OUT", -18, "Bundled with laptop deployments", "SALES_ORDER", "Mia Johnson", 21], ["ADJUSTMENT", -3, "Damaged in transit — write-off", "MANUAL", "Sam Patel", 6]] },
    { sku: "HW-HEADSET", name: "Noise-Cancel Headset", category: "Hardware", price: 180, cost: 96, reorderAt: 30, active: true,
      moves: [["INITIAL", 40, "Opening inventory count", "INITIAL_LOAD", null, 85], ["IN", 20, "Purchase order line: Noise-Cancel Headset", "PURCHASE_ORDER", "Sam Patel", 33], ["OUT", -30, "Support floor rollout", "SALES_ORDER", "Alex Rivera", 12]] },
    { sku: "MERCH-TSHIRT", name: "Logo T-Shirt (mixed sizes)", category: "Merchandise", price: 28, cost: 11, reorderAt: 100, active: true,
      moves: [["INITIAL", 200, "Opening inventory count", "INITIAL_LOAD", null, 88], ["IN", 300, "Purchase order line: Logo T-Shirt restock", "PURCHASE_ORDER", "Sam Patel", 30], ["OUT", -120, "Conference giveaway", "MANUAL", "Mia Johnson", 15]] },
    { sku: "SUP-PAPER-A4", name: "A4 Paper (case of 5 reams)", category: "Supplies", price: 42, cost: 33, reorderAt: 20, active: true,
      moves: [["INITIAL", 40, "Opening inventory count", "INITIAL_LOAD", null, 80], ["OUT", -28, "Print room consumption", "MANUAL", "Alex Rivera", 18], ["OUT", -5, "Print room consumption", "MANUAL", "Alex Rivera", 1]] },
    { sku: "HW-WEBCAM-4K", name: "4K Conference Webcam", category: "Hardware", price: 240, cost: 150, reorderAt: 0, active: false,
      moves: [["INITIAL", 12, "Opening inventory count", "INITIAL_LOAD", null, 120], ["OUT", -7, "Cleared at discount before discontinuation", "SALES_ORDER", "Sam Patel", 45], ["ADJUSTMENT", -2, "Demo units retired", "MANUAL", "Sam Patel", 20]] },
  ];
  for (const p of PHYSICAL) {
    const created = await db.product.create({
      data: {
        workspaceId: WORKSPACE, sku: p.sku, name: p.name, category: p.category, unit: "each",
        price: p.price, cost: p.cost, reorderAt: p.reorderAt, active: p.active, stockOnHand: 0,
      },
    });
    productBySku.set(p.sku, { id: created.id, price: p.price, name: p.name });
    for (const [type, qty, reason, sourceType, owner, daysAgo] of p.moves) {
      await db.stockMovement.create({
        data: {
          workspaceId: WORKSPACE, productId: created.id, type: type as string, quantity: qty as number,
          reason: reason as string, sourceType: sourceType as string, ownerName: (owner as string | null) ?? undefined,
          createdAt: rel(-(daysAgo as number)),
        },
      });
    }
  }

  // -----------------------------------------------------------------------
  // SALES ORDERS (curated, all statuses) — keeps existing pattern.
  // -----------------------------------------------------------------------
  console.log("→ Seeding sales orders");
  const orderByNumber = new Map<string, string>();
  const SALES: {
    customer: string;
    status: "DRAFT" | "SENT" | "CONFIRMED" | "DELIVERED" | "INVOICED" | "CANCELLED";
    amount: number; daysOut: number; owner: string;
  }[] = [
    { customer: "Initech", status: "DRAFT", amount: 9500, daysOut: 14, owner: "sam@aywa.test" },
    { customer: "Northwind Traders", status: "DRAFT", amount: 12000, daysOut: 20, owner: "alex@aywa.test" },
    { customer: "Globex Corporation", status: "SENT", amount: 22000, daysOut: 10, owner: "mia@aywa.test" },
    { customer: "Hooli", status: "SENT", amount: 18500, daysOut: 12, owner: "mia@aywa.test" },
    { customer: "Umbrella Co", status: "CONFIRMED", amount: 36000, daysOut: 7, owner: "alex@aywa.test" },
    { customer: "Pied Piper", status: "CONFIRMED", amount: 48000, daysOut: 5, owner: "alex@aywa.test" },
    { customer: "Stark Industries", status: "DELIVERED", amount: 64000, daysOut: -2, owner: "sam@aywa.test" },
    { customer: "Wonka Industries", status: "DELIVERED", amount: 14000, daysOut: -5, owner: "mia@aywa.test" },
    { customer: "Northwind Traders", status: "INVOICED", amount: 36000, daysOut: -10, owner: "alex@aywa.test" },
    { customer: "Hooli", status: "INVOICED", amount: 12000, daysOut: -20, owner: "mia@aywa.test" },
    { customer: "Globex Corporation", status: "CANCELLED", amount: 8000, daysOut: -8, owner: "sam@aywa.test" },
  ];

  const LINE_PATTERNS: { skus: string[]; pickQty: (i: number) => number; pickDiscount: (i: number) => number }[] = [
    { skus: ["PLT-CORE", "SVC-TRAIN"], pickQty: (i) => (i === 0 ? 1 : 8), pickDiscount: () => 0 },
    { skus: ["PLT-PRO", "ADD-SSO"], pickQty: () => 1, pickDiscount: () => 0 },
    { skus: ["PLT-PRO", "ADD-SSO", "ADD-AUDIT", "SVC-IMPL"], pickQty: (i) => (i === 3 ? 24 : 1), pickDiscount: (i) => (i === 0 ? 10 : 0) },
    { skus: ["PLT-ENT", "INT-CRM", "SUP-PREM"], pickQty: () => 1, pickDiscount: () => 0 },
  ];

  const statusPos: Record<string, number> = {};
  let n = 1;
  for (const s of SALES) {
    const owner = OWNERS.find((o) => o.email === s.owner)!;
    const expected = rel(s.daysOut);
    const position = statusPos[s.status] ?? 0;
    statusPos[s.status] = position + 1;

    const pattern =
      s.amount < 15_000 ? LINE_PATTERNS[0] :
      s.amount < 25_000 ? LINE_PATTERNS[1] :
      s.amount < 50_000 ? LINE_PATTERNS[2] : LINE_PATTERNS[3];

    const lines = pattern.skus.map((sku, i) => {
      const product = productBySku.get(sku)!;
      const quantity = pattern.pickQty(i);
      const discount = pattern.pickDiscount(i);
      return { productId: product.id, description: product.name, quantity, unitPrice: product.price, discount, position: i };
    });
    const computedAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 - l.discount / 100), 0);

    const order = await db.salesOrder.create({
      data: {
        workspaceId: WORKSPACE, number: `SO-${String(n).padStart(4, "0")}`,
        customerId: contactByCompany.get(s.customer), status: s.status, amount: computedAmount,
        currency: "USD", orderDate: new Date(), expectedDate: expected, ownerName: owner.name, position,
      },
    });
    orderByNumber.set(order.number, order.id);
    for (const l of lines) await db.salesOrderLine.create({ data: { orderId: order.id, ...l } });
    n++;
  }

  // Inbox driver: one open order past its expected date (order-overdue).
  const overdueOrder = await db.salesOrder.create({
    data: {
      workspaceId: WORKSPACE, number: "SO-0012", customerId: contactByCompany.get("Pied Piper"),
      status: "CONFIRMED", amount: 27500, currency: "USD", orderDate: rel(-20), expectedDate: rel(-4),
      ownerName: "Alex Rivera", position: 99,
    },
  });
  orderByNumber.set(overdueOrder.number, overdueOrder.id);

  // Back-dated INVOICED orders → "orders" series on the 12-month revenue trend.
  console.log("→ Seeding historical invoiced orders");
  const HISTORIC_ORDERS = [
    { number: "SO-0101", customer: "Northwind Traders", amount: 24000, owner: "Alex Rivera", updated: "2025-07-28", order: "2025-07-10" },
    { number: "SO-0102", customer: "Globex Corporation", amount: 18500, owner: "Mia Johnson", updated: "2025-09-04", order: "2025-08-20" },
    { number: "SO-0103", customer: "Hooli", amount: 32000, owner: "Mia Johnson", updated: "2025-10-30", order: "2025-10-12" },
    { number: "SO-0104", customer: "Stark Industries", amount: 60000, owner: "Sam Patel", updated: "2025-12-19", order: "2025-12-01" },
    { number: "SO-0105", customer: "Initech", amount: 12000, owner: "Sam Patel", updated: "2026-02-07", order: "2026-01-22" },
    { number: "SO-0106", customer: "Umbrella Co", amount: 36000, owner: "Alex Rivera", updated: "2026-04-18", order: "2026-04-01" },
    { number: "SO-0107", customer: "Pied Piper", amount: 21000, owner: "Alex Rivera", updated: "2026-05-26", order: "2026-05-10" },
  ];
  for (const o of HISTORIC_ORDERS) {
    const created = await db.salesOrder.create({
      data: {
        workspaceId: WORKSPACE, number: o.number, customerId: contactByCompany.get(o.customer),
        status: "INVOICED", amount: o.amount, currency: "USD", orderDate: at(o.order),
        ownerName: o.owner, position: 0, createdAt: at(o.order),
      },
    });
    orderByNumber.set(created.number, created.id);
    updatedAtFixes.push({ table: "SalesOrder", id: created.id, ts: at(o.updated) });
  }

  // -----------------------------------------------------------------------
  // VENDORS + PURCHASE ORDERS + PO lines (+ stock IN for received/billed)
  // -----------------------------------------------------------------------
  console.log("→ Seeding vendors + purchase orders");
  const VENDORS = [
    { key: "cloudscale", name: "CloudScale Infrastructure", vendorCode: "VEN-001", email: "ap@cloudscale.test", phone: "+1-415-555-0101", contactPerson: "Dana Whitfield", paymentTerms: "Net 30", notes: "Primary cloud + hosting supplier.", active: true },
    { key: "devtools", name: "DevTools Supply Co", vendorCode: "VEN-002", email: "orders@devtoolssupply.test", phone: "+1-212-555-0142", contactPerson: "Raj Mehta", paymentTerms: "Net 15", notes: "Software licenses and integration connectors.", active: true },
    { key: "meridian", name: "Meridian Consulting Group", vendorCode: "VEN-003", email: "billing@meridiancg.test", phone: "+1-617-555-0188", contactPerson: "Elena Rossi", paymentTerms: "Net 45", notes: "Implementation & onboarding subcontractor.", active: true },
    { key: "apex", name: "Apex Hardware Partners", vendorCode: "VEN-004", email: "sales@apexhw.test", phone: "+1-312-555-0177", contactPerson: "Greg Nolan", paymentTerms: "Net 30", notes: null, active: true },
    { key: "brightline", name: "Brightline Marketing", vendorCode: "VEN-005", email: null, phone: null, contactPerson: "Sofia Marin", paymentTerms: "Due on receipt", notes: "Event and collateral spend.", active: true },
    { key: "legacy", name: "Legacy Office Supplies", vendorCode: null, email: "info@legacyoffice.test", phone: null, contactPerson: null, paymentTerms: null, notes: "Inactive — replaced by Apex.", active: false },
  ];
  const vendorByKey = new Map<string, string>();
  for (const v of VENDORS) {
    const created = await db.vendor.create({
      data: {
        workspaceId: WORKSPACE, name: v.name, vendorCode: v.vendorCode ?? undefined, email: v.email ?? undefined,
        phone: v.phone ?? undefined, contactPerson: v.contactPerson ?? undefined, paymentTerms: v.paymentTerms ?? undefined,
        currency: "USD", notes: v.notes ?? undefined, active: v.active,
      },
    });
    vendorByKey.set(v.key, created.id);
  }

  type POLine = { sku: string | null; description: string; quantity: number; unitCost: number };
  const POS: {
    number: string; vendor: string | null; status: string; owner: string; exp: number; recv?: number;
    notes: string; lines: POLine[]; amount: number;
  }[] = [
    { number: "PO-0001", vendor: "devtools", status: "DRAFT", owner: "Sam Patel", exp: 18, notes: "Draft order for Q3 license renewals.", amount: 6000, lines: [{ sku: "INT-CRM", description: "Salesforce sync integration", quantity: 5, unitCost: 600 }, { sku: "INT-ERP", description: "NetSuite sync integration", quantity: 5, unitCost: 600 }] },
    { number: "PO-0002", vendor: null, status: "DRAFT", owner: "Mia Johnson", exp: -3, notes: "No vendor assigned yet — sourcing in progress.", amount: 850, lines: [{ sku: null, description: "Misc. office consumables (uncategorized)", quantity: 1, unitCost: 850 }] },
    { number: "PO-0003", vendor: "cloudscale", status: "RFQ_SENT", owner: "Alex Rivera", exp: 12, notes: "RFQ emailed to CloudScale for annual hosting capacity.", amount: 5400, lines: [{ sku: "SUP-PREM", description: "Premium support — annual", quantity: 4, unitCost: 600 }, { sku: "ADD-AUDIT", description: "Audit log add-on", quantity: 10, unitCost: 300 }] },
    { number: "PO-0004", vendor: "brightline", status: "RFQ_SENT", owner: "Mia Johnson", exp: -2, notes: "Awaiting quote for Q3 event collateral.", amount: 4200, lines: [{ sku: null, description: "Trade show booth + printed collateral", quantity: 1, unitCost: 4200 }] },
    { number: "PO-0005", vendor: "meridian", status: "APPROVED", owner: "Alex Rivera", exp: 5, notes: "Approved — implementation subcontract hours for Stark rollout.", amount: 13200, lines: [{ sku: "SVC-IMPL", description: "Implementation services", quantity: 80, unitCost: 120 }, { sku: "SVC-TRAIN", description: "Onboarding & training", quantity: 40, unitCost: 90 }] },
    { number: "PO-0006", vendor: "devtools", status: "APPROVED", owner: "Sam Patel", exp: -1, notes: "Approved license top-up. (Slightly overdue.)", amount: 8000, lines: [{ sku: "ADD-SSO", description: "SSO + SCIM add-on", quantity: 20, unitCost: 400 }] },
    { number: "PO-0007", vendor: "cloudscale", status: "RECEIVED", owner: "Alex Rivera", exp: -6, recv: -5, notes: "Goods received. Stock updated via IN movements.", amount: 12000, lines: [{ sku: "PLT-CORE", description: "aywa Platform — Core", quantity: 3, unitCost: 2000 }, { sku: "PLT-PRO", description: "aywa Platform — Pro", quantity: 2, unitCost: 3000 }] },
    { number: "PO-0008", vendor: "apex", status: "RECEIVED", owner: "Mia Johnson", exp: -9, recv: -8, notes: "Hardware/peripherals received in full.", amount: 9900, lines: [{ sku: "ADD-AUDIT", description: "Audit log add-on", quantity: 25, unitCost: 300 }, { sku: "INT-ERP", description: "NetSuite sync integration", quantity: 4, unitCost: 600 }] },
    { number: "PO-0009", vendor: "meridian", status: "BILLED", owner: "Alex Rivera", exp: -20, recv: -18, notes: "Vendor invoice processed and matched (3-way). Paid Net 45.", amount: 14400, lines: [{ sku: "SVC-IMPL", description: "Implementation services", quantity: 120, unitCost: 120 }] },
    { number: "PO-0010", vendor: "devtools", status: "BILLED", owner: "Sam Patel", exp: -30, recv: -28, notes: "License purchase billed and closed.", amount: 6200, lines: [{ sku: "PLT-ENT", description: "aywa Platform — Enterprise", quantity: 1, unitCost: 5000 }, { sku: "SUP-PREM", description: "Premium support — annual", quantity: 2, unitCost: 600 }] },
    { number: "PO-0011", vendor: "brightline", status: "CANCELLED", owner: "Mia Johnson", exp: -12, notes: "Cancelled — event postponed.", amount: 7500, lines: [{ sku: null, description: "Conference sponsorship package", quantity: 1, unitCost: 7500 }] },
  ];
  const poStatusPos: Record<string, number> = {};
  for (const po of POS) {
    const position = poStatusPos[po.status] ?? 0;
    poStatusPos[po.status] = position + 1;
    const created = await db.purchaseOrder.create({
      data: {
        workspaceId: WORKSPACE, number: po.number, vendorId: po.vendor ? vendorByKey.get(po.vendor) : undefined,
        status: po.status, amount: po.amount, currency: "USD", orderDate: rel(po.exp - 14),
        expectedDate: rel(po.exp), receivedDate: po.recv !== undefined ? rel(po.recv) : undefined,
        notes: po.notes, ownerName: po.owner, position,
      },
    });
    for (const [i, l] of po.lines.entries()) {
      await db.purchaseOrderLine.create({
        data: {
          orderId: created.id, productId: l.sku ? productBySku.get(l.sku)!.id : undefined,
          description: l.description, quantity: l.quantity, unitCost: l.unitCost, position: i,
        },
      });
    }
    // Received/billed POs raise on-hand via IN stock movements (mirrors live app).
    if (po.status === "RECEIVED" || po.status === "BILLED") {
      for (const l of po.lines) {
        if (!l.sku) continue;
        await db.stockMovement.create({
          data: {
            workspaceId: WORKSPACE, productId: productBySku.get(l.sku)!.id, type: "IN", quantity: l.quantity,
            reason: `Purchase order line: ${l.description}`, sourceType: "PURCHASE_ORDER", sourceId: created.id,
            ownerName: po.owner, createdAt: po.recv !== undefined ? rel(po.recv) : rel(po.exp),
          },
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // SUBSCRIPTIONS (recurring revenue → MRR/ARR)
  // -----------------------------------------------------------------------
  console.log("→ Seeding subscriptions");
  const SUBS: {
    company: string; sku: string; name: string; period: "MONTHLY" | "QUARTERLY" | "YEARLY"; months: number;
    qty: number; price: number; status: "ACTIVE" | "PAUSED" | "CANCELLED"; start: string; end: string | null;
    renew: string | null; notes: string;
  }[] = [
    { company: "Stark Industries", sku: "PLT-ENT", name: "Stark Industries — Platform Enterprise", period: "YEARLY", months: 12, qty: 1, price: 60000, status: "ACTIVE", start: "2025-09-01", end: null, renew: "2026-09-01", notes: "Enterprise annual contract." },
    { company: "Hooli", sku: "PLT-ENT", name: "Hooli — Platform Enterprise", period: "YEARLY", months: 12, qty: 2, price: 54000, status: "ACTIVE", start: "2025-11-15", end: null, renew: "2026-11-15", notes: "2 seats, 10% multi-seat discount." },
    { company: "Globex Corporation", sku: "PLT-PRO", name: "Globex Corporation — Platform Pro", period: "YEARLY", months: 12, qty: 1, price: 24000, status: "ACTIVE", start: "2026-01-10", end: null, renew: "2027-01-10", notes: "Annual." },
    { company: "Northwind Traders", sku: "PLT-CORE", name: "Northwind Traders — Platform Core", period: "MONTHLY", months: 1, qty: 1, price: 1200, status: "ACTIVE", start: "2026-03-01", end: null, renew: rel(9).toISOString(), notes: "Month-to-month." },
    { company: "Initech", sku: "SUP-PREM", name: "Initech — Premium Support", period: "QUARTERLY", months: 3, qty: 1, price: 9600, status: "ACTIVE", start: "2026-02-01", end: null, renew: rel(14).toISOString(), notes: "Premium support, quarterly." },
    { company: "Pied Piper", sku: "ADD-SSO", name: "Pied Piper — SSO + SCIM Add-on", period: "MONTHLY", months: 1, qty: 1, price: 400, status: "ACTIVE", start: rel(-4).toISOString(), end: null, renew: rel(26).toISOString(), notes: "New this month." },
    { company: "Wonka Industries", sku: "INT-CRM", name: "Wonka Industries — Salesforce Sync", period: "YEARLY", months: 12, qty: 1, price: 6000, status: "ACTIVE", start: rel(-2).toISOString(), end: null, renew: rel(363).toISOString(), notes: "New this month." },
    { company: "Umbrella Co", sku: "PLT-PRO", name: "Umbrella Co — Platform Pro", period: "YEARLY", months: 12, qty: 1, price: 24000, status: "PAUSED", start: "2025-08-01", end: null, renew: null, notes: "Paused during budget freeze." },
    { company: "Pied Piper", sku: "ADD-AUDIT", name: "Pied Piper — Audit Log Add-on", period: "QUARTERLY", months: 3, qty: 1, price: 3600, status: "PAUSED", start: "2025-12-01", end: null, renew: null, notes: "Paused pending compliance review." },
    { company: "Initech", sku: "INT-ERP", name: "Initech — NetSuite Sync", period: "YEARLY", months: 12, qty: 1, price: 7200, status: "CANCELLED", start: "2024-06-01", end: "2026-05-31", renew: null, notes: "Churned — migrated off NetSuite." },
    { company: "Umbrella Co", sku: "PLT-CORE", name: "Umbrella Co — Platform Core", period: "MONTHLY", months: 1, qty: 1, price: 1200, status: "CANCELLED", start: "2025-01-15", end: "2026-06-01", renew: null, notes: "Churned — downgraded to free tier." },
    { company: "Globex Corporation", sku: "SVC-TRAIN", name: "Globex Corporation — Onboarding & Training", period: "QUARTERLY", months: 3, qty: 4, price: 180, status: "CANCELLED", start: "2025-03-01", end: "2025-12-31", renew: null, notes: "Ended last year." },
  ];
  for (const s of SUBS) {
    await db.subscription.create({
      data: {
        workspaceId: WORKSPACE, customerId: contactByCompany.get(s.company), productId: productBySku.get(s.sku)?.id,
        name: s.name, billingPeriod: s.period, billingPeriodMonths: s.months, quantity: s.qty, unitPrice: s.price,
        currency: "USD", status: s.status, startDate: at(s.start), endDate: s.end ? at(s.end) : undefined,
        nextRenewalDate: s.renew ? at(s.renew) : undefined, notes: s.notes,
      },
    });
  }

  // -----------------------------------------------------------------------
  // HR — employees (with manager hierarchy) + time-off requests
  // -----------------------------------------------------------------------
  console.log("→ Seeding HR");
  const EMPLOYEES: {
    key: string; name: string; email: string | null; phone: string | null; title: string; dept: string;
    hire: string; status: "ACTIVE" | "INACTIVE" | "ON_LEAVE"; manager: string | null;
  }[] = [
    { key: "ceo", name: "Diana Prince", email: "diana.prince@acme.com", phone: "+1 415 555 0101", title: "Chief Executive Officer", dept: "Executive", hire: "2019-01-15", status: "ACTIVE", manager: null },
    { key: "cto", name: "Marcus Chen", email: "marcus.chen@acme.com", phone: "+1 415 555 0102", title: "Chief Technology Officer", dept: "Engineering", hire: "2019-03-04", status: "ACTIVE", manager: "ceo" },
    { key: "vpsales", name: "Alex Rivera", email: "alex.rivera@acme.com", phone: "+1 415 555 0103", title: "VP of Sales", dept: "Sales", hire: "2020-02-10", status: "ACTIVE", manager: "ceo" },
    { key: "eng1", name: "Priya Sharma", email: "priya.sharma@acme.com", phone: "+1 415 555 0104", title: "Staff Engineer", dept: "Engineering", hire: "2020-06-22", status: "ACTIVE", manager: "cto" },
    { key: "eng2", name: "Tom Becker", email: "tom.becker@acme.com", phone: "+1 415 555 0105", title: "Senior Engineer", dept: "Engineering", hire: "2021-09-13", status: "ON_LEAVE", manager: "cto" },
    { key: "sales1", name: "Mia Johnson", email: "mia.johnson@acme.com", phone: "+1 415 555 0106", title: "Account Executive", dept: "Sales", hire: "2021-11-01", status: "ACTIVE", manager: "vpsales" },
    { key: "sales2", name: "Sam Patel", email: "sam.patel@acme.com", phone: "+1 415 555 0107", title: "Account Executive", dept: "Sales", hire: "2022-03-03", status: "ACTIVE", manager: "vpsales" },
    { key: "mkt1", name: "Laura Gomez", email: "laura.gomez@acme.com", phone: "+1 415 555 0108", title: "Marketing Manager", dept: "Marketing", hire: "2022-07-18", status: "ACTIVE", manager: "ceo" },
    { key: "ops1", name: "Kevin Wright", email: "kevin.wright@acme.com", phone: null, title: "Operations Lead", dept: "Operations", hire: "2023-01-09", status: "ACTIVE", manager: "ceo" },
    { key: "sup1", name: "Nina Alvarez", email: "nina.alvarez@acme.com", phone: "+1 415 555 0110", title: "Support Specialist", dept: "Support", hire: "2023-05-20", status: "INACTIVE", manager: "ops1" },
  ];
  const empByKey = new Map<string, string>();
  for (const e of EMPLOYEES) {
    const created = await db.employee.create({
      data: {
        workspaceId: WORKSPACE, name: e.name, email: e.email ?? undefined, phone: e.phone ?? undefined,
        title: e.title, department: e.dept, hireDate: at(e.hire), status: e.status,
        managerId: e.manager ? empByKey.get(e.manager) : undefined,
      },
    });
    empByKey.set(e.key, created.id);
  }

  const TIME_OFF: {
    emp: string; type: "VACATION" | "SICK" | "PERSONAL" | "OTHER"; start: string; end: string;
    status: "PENDING" | "APPROVED" | "DENIED" | "CANCELLED"; reason: string | null; reviewedAt: string | null; reviewedBy: string | null;
  }[] = [
    { emp: "eng2", type: "SICK", start: "2026-06-01", end: "2026-06-12", status: "APPROVED", reason: "Medical leave - recovery", reviewedAt: "2026-05-28", reviewedBy: "Marcus Chen" },
    { emp: "sales1", type: "VACATION", start: "2026-05-11", end: "2026-05-15", status: "APPROVED", reason: "Family trip to Spain", reviewedAt: "2026-04-30", reviewedBy: "Alex Rivera" },
    { emp: "eng1", type: "PERSONAL", start: "2026-04-20", end: "2026-04-20", status: "APPROVED", reason: "Apartment move", reviewedAt: "2026-04-15", reviewedBy: "Marcus Chen" },
    { emp: "mkt1", type: "VACATION", start: "2026-03-23", end: "2026-03-27", status: "DENIED", reason: "Conflicts with product launch", reviewedAt: "2026-03-10", reviewedBy: "Diana Prince" },
    { emp: "sales2", type: "PERSONAL", start: "2026-02-09", end: "2026-02-10", status: "DENIED", reason: "Short notice during quarter close", reviewedAt: "2026-02-05", reviewedBy: "Alex Rivera" },
    { emp: "eng1", type: "VACATION", start: "2026-07-13", end: "2026-07-17", status: "PENDING", reason: "Summer holiday", reviewedAt: null, reviewedBy: null },
    { emp: "sales1", type: "SICK", start: "2026-06-15", end: "2026-06-16", status: "PENDING", reason: null, reviewedAt: null, reviewedBy: null },
    { emp: "ops1", type: "OTHER", start: "2026-06-22", end: "2026-06-24", status: "PENDING", reason: "Jury duty", reviewedAt: null, reviewedBy: null },
    { emp: "ops1", type: "OTHER", start: "2026-01-05", end: "2026-01-09", status: "CANCELLED", reason: "Plans changed", reviewedAt: "2026-01-02", reviewedBy: "Diana Prince" },
  ];
  for (const t of TIME_OFF) {
    await db.timeOffRequest.create({
      data: {
        workspaceId: WORKSPACE, employeeId: empByKey.get(t.emp)!, type: t.type, startDate: at(t.start), endDate: at(t.end),
        status: t.status, reason: t.reason ?? undefined, reviewedAt: t.reviewedAt ? at(t.reviewedAt) : undefined,
        reviewedBy: t.reviewedBy ?? undefined,
      },
    });
  }

  // -----------------------------------------------------------------------
  // PROJECTS + TASKS
  // -----------------------------------------------------------------------
  console.log("→ Seeding projects + tasks");
  const PROJECTS: {
    key: string; name: string; description: string; status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
    customer: string | null; owner: string; budget: number; start: string; due: string;
  }[] = [
    { key: "P1", name: "Hooli — Multi-region rollout", description: "Phased rollout across EU, APAC and US-East with SSO and audit logging.", status: "ACTIVE", customer: "Hooli", owner: "Mia Johnson", budget: 120000, start: "2026-03-02", due: "2026-07-31" },
    { key: "P2", name: "Stark Industries — Custom integrations", description: "Build bespoke CRM and ERP sync connectors and a data-migration pipeline.", status: "ACTIVE", customer: "Stark Industries", owner: "Sam Patel", budget: 95000, start: "2026-04-15", due: "2026-06-12" },
    { key: "P3", name: "Initech — Onboarding & training", description: "Implementation services plus admin and end-user training program.", status: "ACTIVE", customer: "Initech", owner: "Alex Rivera", budget: 42000, start: "2026-05-04", due: "2026-06-26" },
    { key: "P4", name: "Umbrella Co — Q2 renewal migration", description: "Migrate legacy tenant to Pro tier ahead of the Q2 renewal.", status: "ON_HOLD", customer: "Umbrella Co", owner: "Alex Rivera", budget: 36000, start: "2026-02-10", due: "2026-08-15" },
    { key: "P5", name: "Northwind Traders — Q1 platform launch", description: "Initial platform launch, data import and go-live support. Delivered Q1.", status: "COMPLETED", customer: "Northwind Traders", owner: "Alex Rivera", budget: 48000, start: "2026-01-06", due: "2026-03-20" },
    { key: "P6", name: "Internal — Customer portal revamp", description: "Internal initiative to redesign the self-serve customer portal and billing UX.", status: "ACTIVE", customer: null, owner: "Mia Johnson", budget: 60000, start: "2026-04-01", due: "2026-09-30" },
    { key: "P7", name: "Globex Corporation — EU expansion (shelved)", description: "EU data-residency add-on rollout. Paused after deal stalled.", status: "CANCELLED", customer: "Globex Corporation", owner: "Sam Patel", budget: 22000, start: "2026-03-18", due: "2026-05-30" },
  ];
  const projByKey = new Map<string, string>();
  for (const p of PROJECTS) {
    const created = await db.project.create({
      data: {
        workspaceId: WORKSPACE, name: p.name, description: p.description, status: p.status,
        customerId: p.customer ? contactByCompany.get(p.customer) : undefined, ownerName: p.owner,
        budget: p.budget, startDate: at(p.start), dueDate: at(p.due),
      },
    });
    projByKey.set(p.key, created.id);
  }

  const TASKS: {
    proj: string; title: string; status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE"; assignee: string; due: string | null; pos: number;
  }[] = [
    { proj: "P1", title: "Finalize region rollout plan", status: "DONE", assignee: "Mia Johnson", due: "2026-03-15", pos: 0 },
    { proj: "P1", title: "Provision EU production tenant", status: "DONE", assignee: "Sam Patel", due: "2026-04-02", pos: 1 },
    { proj: "P1", title: "Configure SSO + SCIM", status: "REVIEW", assignee: "Sam Patel", due: "2026-06-09", pos: 0 },
    { proj: "P1", title: "APAC load & latency testing", status: "IN_PROGRESS", assignee: "Mia Johnson", due: "2026-06-18", pos: 0 },
    { proj: "P1", title: "Enable audit log streaming", status: "IN_PROGRESS", assignee: "Alex Rivera", due: "2026-06-22", pos: 1 },
    { proj: "P1", title: "US-East cutover runbook", status: "BACKLOG", assignee: "Sam Patel", due: "2026-07-10", pos: 0 },
    { proj: "P1", title: "Customer go-live training", status: "BACKLOG", assignee: "Mia Johnson", due: "2026-07-24", pos: 1 },
    { proj: "P2", title: "Discovery: integration requirements", status: "DONE", assignee: "Sam Patel", due: "2026-04-20", pos: 0 },
    { proj: "P2", title: "Build Salesforce sync connector", status: "IN_PROGRESS", assignee: "Sam Patel", due: "2026-06-04", pos: 0 },
    { proj: "P2", title: "Build NetSuite sync connector", status: "IN_PROGRESS", assignee: "Alex Rivera", due: "2026-06-10", pos: 1 },
    { proj: "P2", title: "Data migration dry run", status: "REVIEW", assignee: "Mia Johnson", due: "2026-06-07", pos: 0 },
    { proj: "P2", title: "Security review of connectors", status: "BACKLOG", assignee: "Sam Patel", due: "2026-06-12", pos: 0 },
    { proj: "P3", title: "Kickoff & success plan", status: "DONE", assignee: "Alex Rivera", due: "2026-05-08", pos: 0 },
    { proj: "P3", title: "Import legacy account data", status: "REVIEW", assignee: "Alex Rivera", due: "2026-06-05", pos: 0 },
    { proj: "P3", title: "Run admin training session", status: "IN_PROGRESS", assignee: "Mia Johnson", due: "2026-06-11", pos: 0 },
    { proj: "P3", title: "End-user training & handoff", status: "BACKLOG", assignee: "Alex Rivera", due: "2026-06-24", pos: 0 },
    { proj: "P4", title: "Audit current tenant config", status: "DONE", assignee: "Alex Rivera", due: "2026-02-20", pos: 0 },
    { proj: "P4", title: "Pro tier feature gap review", status: "REVIEW", assignee: "Mia Johnson", due: "2026-05-15", pos: 0 },
    { proj: "P4", title: "Awaiting customer sign-off", status: "BACKLOG", assignee: "Alex Rivera", due: "2026-08-01", pos: 0 },
    { proj: "P4", title: "Schedule migration window", status: "BACKLOG", assignee: "Sam Patel", due: null, pos: 1 },
    { proj: "P5", title: "Provision production tenant", status: "DONE", assignee: "Alex Rivera", due: "2026-01-15", pos: 0 },
    { proj: "P5", title: "Import catalog & customers", status: "DONE", assignee: "Sam Patel", due: "2026-02-02", pos: 1 },
    { proj: "P5", title: "Go-live cutover", status: "DONE", assignee: "Alex Rivera", due: "2026-03-10", pos: 2 },
    { proj: "P5", title: "Post-launch hypercare review", status: "DONE", assignee: "Mia Johnson", due: "2026-03-20", pos: 3 },
    { proj: "P6", title: "UX audit of current portal", status: "DONE", assignee: "Mia Johnson", due: "2026-04-12", pos: 0 },
    { proj: "P6", title: "New billing flow wireframes", status: "REVIEW", assignee: "Mia Johnson", due: "2026-06-08", pos: 0 },
    { proj: "P6", title: "Implement portal redesign", status: "IN_PROGRESS", assignee: "Sam Patel", due: "2026-07-15", pos: 0 },
    { proj: "P6", title: "Self-serve invoice download", status: "BACKLOG", assignee: "Alex Rivera", due: "2026-08-20", pos: 0 },
    { proj: "P6", title: "Accessibility pass (WCAG AA)", status: "BACKLOG", assignee: "Mia Johnson", due: "2026-09-15", pos: 1 },
    { proj: "P7", title: "Draft EU data-residency scope", status: "BACKLOG", assignee: "Sam Patel", due: null, pos: 0 },
    { proj: "P7", title: "Vendor DPA review (dropped)", status: "BACKLOG", assignee: "Sam Patel", due: null, pos: 1 },
  ];
  for (const t of TASKS) {
    await db.task.create({
      data: {
        workspaceId: WORKSPACE, projectId: projByKey.get(t.proj)!, title: t.title, status: t.status,
        assigneeName: t.assignee, dueDate: t.due ? at(t.due) : undefined, position: t.pos,
      },
    });
  }

  // -----------------------------------------------------------------------
  // PLATFORM — workspace, users, memberships, invitations
  // -----------------------------------------------------------------------
  console.log("→ Seeding workspace + members");
  await db.workspace.upsert({
    where: { id: WORKSPACE },
    update: { name: "Acme Corp", slug: "acme", plan: "PRO", defaultCurrency: "USD", accentColor: "oklch(0.48 0.20 265)" },
    create: { id: WORKSPACE, name: "Acme Corp", slug: "acme", plan: "PRO", defaultCurrency: "USD", accentColor: "oklch(0.48 0.20 265)" },
  });

  // -----------------------------------------------------------------------
  // ACCOUNTING — chart of accounts, journals, and a few opening entries so
  // the financial statements render with real numbers out of the box.
  // -----------------------------------------------------------------------
  console.log("→ Seeding chart of accounts + journals");
  const CHART = [
    { code: "1000", name: "Cash", type: "ASSET" },
    { code: "1010", name: "Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Inventory", type: "ASSET" },
    { code: "1500", name: "Fixed Assets", type: "ASSET" },
    { code: "2100", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2200", name: "Taxes Payable", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "3900", name: "Retained Earnings", type: "EQUITY" },
    { code: "4000", name: "Sales Revenue", type: "INCOME" },
    { code: "4100", name: "Other Income", type: "INCOME" },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
    { code: "5100", name: "Salaries & Wages", type: "EXPENSE" },
    { code: "5200", name: "Rent", type: "EXPENSE" },
    { code: "5300", name: "Utilities", type: "EXPENSE" },
    { code: "5900", name: "Other Expenses", type: "EXPENSE" },
  ];
  const acctId = new Map<string, string>();
  for (const a of CHART) {
    const created = await db.ledgerAccount.create({
      data: { workspaceId: WORKSPACE, code: a.code, name: a.name, type: a.type, currency: "USD" },
    });
    acctId.set(a.code, created.id);
  }

  const JOURNALS = [
    { code: "SAL", name: "Customer Invoices", type: "SALE" },
    { code: "PUR", name: "Vendor Bills", type: "PURCHASE" },
    { code: "BNK", name: "Bank", type: "BANK" },
    { code: "CSH", name: "Cash", type: "CASH" },
    { code: "MISC", name: "Miscellaneous Operations", type: "GENERAL" },
  ];
  const journalId = new Map<string, string>();
  for (const j of JOURNALS) {
    const created = await db.journal.create({
      data: { workspaceId: WORKSPACE, code: j.code, name: j.name, type: j.type },
    });
    journalId.set(j.type, created.id);
  }

  // A handful of posted opening entries (balanced) so reports aren't empty.
  const SEED_ENTRIES: {
    number: string;
    journalType: string;
    reference: string;
    daysOut: number;
    lines: { code: string; debit?: number; credit?: number }[];
  }[] = [
    {
      number: "JE-0001",
      journalType: "GENERAL",
      reference: "Opening balance — capital injection",
      daysOut: -120,
      lines: [
        { code: "1010", debit: 80000 },
        { code: "3000", credit: 80000 },
      ],
    },
    {
      number: "JE-0002",
      journalType: "GENERAL",
      reference: "Office equipment purchase",
      daysOut: -90,
      lines: [
        { code: "1500", debit: 18000 },
        { code: "1010", credit: 18000 },
      ],
    },
    {
      number: "JE-0003",
      journalType: "SALE",
      reference: "Consulting revenue",
      daysOut: -45,
      lines: [
        { code: "1100", debit: 24000 },
        { code: "4000", credit: 24000 },
      ],
    },
    {
      number: "JE-0004",
      journalType: "GENERAL",
      reference: "Monthly rent",
      daysOut: -30,
      lines: [
        { code: "5200", debit: 3500 },
        { code: "1010", credit: 3500 },
      ],
    },
    {
      number: "JE-0005",
      journalType: "GENERAL",
      reference: "Payroll run",
      daysOut: -15,
      lines: [
        { code: "5100", debit: 12000 },
        { code: "1010", credit: 12000 },
      ],
    },
  ];
  console.log("→ Seeding opening journal entries");
  for (const e of SEED_ENTRIES) {
    await db.journalEntry.create({
      data: {
        workspaceId: WORKSPACE,
        journalId: journalId.get(e.journalType)!,
        number: e.number,
        date: rel(e.daysOut),
        reference: e.reference,
        status: "POSTED",
        currency: "USD",
        sourceType: "MANUAL",
        postedAt: rel(e.daysOut),
        createdBy: "Jordan Avery",
        lines: {
          create: e.lines.map((l, i) => ({
            accountId: acctId.get(l.code)!,
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            position: i,
          })),
        },
      },
    });
  }

  // -----------------------------------------------------------------------
  // MANUFACTURING — finished-good kits, BOMs, and production orders. One DONE
  // order writes its component-OUT / product-IN movements so the inventory
  // ledger reflects production out of the box.
  // -----------------------------------------------------------------------
  console.log("→ Seeding manufacturing (kits, BOMs, orders)");
  const KITS = [
    { sku: "KIT-WS", name: "Workstation Kit", price: 2100, cost: 1400 },
    { sku: "KIT-CONF", name: "Conference Room Kit", price: 900, cost: 600 },
  ];
  for (const k of KITS) {
    await db.product.create({
      data: {
        workspaceId: WORKSPACE,
        sku: k.sku,
        name: k.name,
        category: "Finished goods",
        unit: "each",
        price: k.price,
        cost: k.cost,
        active: true,
      },
    });
  }

  const mfgSkus = ["HW-LAPTOP-14", "HW-DOCK-USB4", "HW-HEADSET", "KIT-WS", "KIT-CONF"];
  const mfgProducts = await db.product.findMany({
    where: { workspaceId: WORKSPACE, sku: { in: mfgSkus } },
    select: { id: true, sku: true },
  });
  const pidBySku = new Map(mfgProducts.map((p) => [p.sku, p.id]));

  const BOMS = [
    {
      reference: "BOM-0001",
      productSku: "KIT-WS",
      quantity: 1,
      components: [
        { sku: "HW-LAPTOP-14", qty: 1 },
        { sku: "HW-DOCK-USB4", qty: 1 },
        { sku: "HW-HEADSET", qty: 1 },
      ],
    },
    {
      reference: "BOM-0002",
      productSku: "KIT-CONF",
      quantity: 1,
      components: [
        { sku: "HW-DOCK-USB4", qty: 1 },
        { sku: "HW-HEADSET", qty: 2 },
      ],
    },
  ];
  const bomBySku = new Map<string, { id: string; quantity: number }>();
  for (const b of BOMS) {
    const productId = pidBySku.get(b.productSku);
    if (!productId) continue;
    const created = await db.bom.create({
      data: {
        workspaceId: WORKSPACE,
        productId,
        reference: b.reference,
        quantity: b.quantity,
        components: {
          create: b.components
            .filter((c) => pidBySku.has(c.sku))
            .map((c, i) => ({ productId: pidBySku.get(c.sku)!, quantity: c.qty, position: i })),
        },
      },
    });
    bomBySku.set(b.productSku, { id: created.id, quantity: b.quantity });
  }

  const MOS = [
    { number: "MO-0001", productSku: "KIT-WS", qty: 2, status: "DONE", sched: -12, completed: -10, owner: "Sam Patel" },
    { number: "MO-0002", productSku: "KIT-WS", qty: 3, status: "IN_PROGRESS", sched: -2, owner: "Mia Johnson" },
    { number: "MO-0003", productSku: "KIT-CONF", qty: 4, status: "CONFIRMED", sched: 5, owner: "Alex Rivera" },
    { number: "MO-0004", productSku: "KIT-WS", qty: 10, status: "DRAFT", sched: 14, owner: "Sam Patel" },
  ];
  let moPos = 0;
  for (const m of MOS) {
    const productId = pidBySku.get(m.productSku);
    const bom = bomBySku.get(m.productSku);
    if (!productId) continue;
    const created = await db.manufacturingOrder.create({
      data: {
        workspaceId: WORKSPACE,
        number: m.number,
        productId,
        bomId: bom?.id ?? null,
        quantity: m.qty,
        status: m.status,
        scheduledDate: rel(m.sched),
        completedDate: m.completed !== undefined ? rel(m.completed) : null,
        ownerName: m.owner,
        position: moPos++,
      },
    });

    // For the completed order, write the stock movements production would have
    // created (component OUT, product IN) and keep stockOnHand in sync.
    if (m.status === "DONE") {
      const def = BOMS.find((b) => b.productSku === m.productSku);
      const factor = bom && bom.quantity > 0 ? m.qty / bom.quantity : 1;
      for (const c of def?.components ?? []) {
        const compId = pidBySku.get(c.sku);
        if (!compId) continue;
        const qty = -(c.qty * factor);
        await db.stockMovement.create({
          data: {
            workspaceId: WORKSPACE,
            productId: compId,
            type: "OUT",
            quantity: qty,
            reason: `Consumed by ${m.number}`,
            sourceType: "MANUFACTURING_ORDER",
            sourceId: created.id,
            ownerName: m.owner,
            createdAt: rel(m.completed ?? m.sched),
          },
        });
        await db.product.update({
          where: { id: compId },
          data: { stockOnHand: { increment: Math.round(qty) } },
        });
      }
      await db.stockMovement.create({
        data: {
          workspaceId: WORKSPACE,
          productId,
          type: "IN",
          quantity: m.qty,
          reason: `Produced by ${m.number}`,
          sourceType: "MANUFACTURING_ORDER",
          sourceId: created.id,
          ownerName: m.owner,
          createdAt: rel(m.completed ?? m.sched),
        },
      });
      await db.product.update({
        where: { id: productId },
        data: { stockOnHand: { increment: Math.round(m.qty) } },
      });
    }
  }

  const USERS = [
    { email: "salamfoods.uz@gmail.com", name: "Jordan Avery", role: "OWNER", joined: "2026-01-10" },
    { email: "alex@aywa.test", name: "Alex Rivera", role: "ADMIN", joined: "2026-01-12" },
    { email: "mia@aywa.test", name: "Mia Johnson", role: "MEMBER", joined: "2026-01-15" },
    { email: "sam@aywa.test", name: "Sam Patel", role: "MEMBER", joined: "2026-02-01" },
    { email: "dana@aywa.test", name: "Dana Whitfield", role: "VIEWER", joined: "2026-03-05" },
  ];
  for (const u of USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: { email: u.email, name: u.name, emailVerified: at(u.joined) },
    });
    await db.membership.create({
      data: { userId: user.id, workspaceId: WORKSPACE, role: u.role, createdAt: at(u.joined) },
    });
  }

  const INVITATIONS = [
    { email: "chris.nguyen@acme.test", role: "MEMBER", token: "inv_tok_chris_3f9a2c", invitedBy: "Alex Rivera", expires: rel(7) },
    { email: "finance@acme.test", role: "ADMIN", token: "inv_tok_finance_7b1d4e", invitedBy: "Jordan Avery", expires: rel(5) },
    { email: "auditor@external.test", role: "VIEWER", token: "inv_tok_audit_9c2e8f", invitedBy: "Mia Johnson", expires: rel(3) },
  ];
  for (const inv of INVITATIONS) {
    await db.invitation.create({
      data: { workspaceId: WORKSPACE, email: inv.email, role: inv.role, token: inv.token, invitedBy: inv.invitedBy, expiresAt: inv.expires },
    });
  }

  // -----------------------------------------------------------------------
  // AUDIT LOG
  // -----------------------------------------------------------------------
  console.log("→ Seeding audit log");
  const AUDIT: { user: string; email: string; action: string; entity: string; summary: string; ago: number }[] = [
    { user: "Alex Rivera", email: "alex@aywa.test", action: "CREATE", entity: "DEAL", summary: "Created deal Annual platform license for Northwind Traders", ago: 0 },
    { user: "Alex Rivera", email: "alex@aywa.test", action: "STATUS_CHANGE", entity: "DEAL", summary: "Moved deal Enterprise tier upgrade to PROPOSAL", ago: 0 },
    { user: "Mia Johnson", email: "mia@aywa.test", action: "STATUS_CHANGE", entity: "DEAL", summary: "Moved deal Pilot expansion to NEGOTIATION", ago: 0 },
    { user: "Sam Patel", email: "sam@aywa.test", action: "CREATE", entity: "ORDER", summary: "Created sales order SO-0001 for Initech", ago: 0 },
    { user: "Mia Johnson", email: "mia@aywa.test", action: "SEND", entity: "ORDER", summary: "Sent quote SO-0003 to Globex Corporation", ago: 0 },
    { user: "Alex Rivera", email: "alex@aywa.test", action: "STATUS_CHANGE", entity: "ORDER", summary: "Marked SO-0007 as DELIVERED", ago: 1 },
    { user: "Jordan Avery", email: "salamfoods.uz@gmail.com", action: "UPDATE", entity: "PRODUCT", summary: "Updated price on PLT-PRO to $24,000", ago: 1 },
    { user: "Sam Patel", email: "sam@aywa.test", action: "CREATE", entity: "PO", summary: "Created purchase order PO-0001 for DevTools Supply Co", ago: 1 },
    { user: "Mia Johnson", email: "mia@aywa.test", action: "SEND", entity: "PO", summary: "Sent RFQ PO-0003 to CloudScale Infrastructure", ago: 2 },
    { user: "Alex Rivera", email: "alex@aywa.test", action: "CREATE", entity: "VENDOR", summary: "Added vendor Apex Hardware Partners", ago: 2 },
    { user: "Jordan Avery", email: "salamfoods.uz@gmail.com", action: "UPDATE", entity: "CUSTOMER", summary: "Updated contact details for Sarah Chen (Northwind Traders)", ago: 2 },
    { user: "Sam Patel", email: "sam@aywa.test", action: "CREATE", entity: "ACTIVITY", summary: "Logged call: Discovery call with Pied Piper", ago: 3 },
    { user: "Mia Johnson", email: "mia@aywa.test", action: "CREATE", entity: "MOVEMENT", summary: "Received 25 units of Audit log add-on from PO-0008", ago: 3 },
    { user: "Alex Rivera", email: "alex@aywa.test", action: "DELETE", entity: "DEAL", summary: "Deleted duplicate deal Test opportunity", ago: 3 },
    { user: "Jordan Avery", email: "salamfoods.uz@gmail.com", action: "CREATE", entity: "OTHER", summary: "Invited finance@acme.test as admin", ago: 4 },
    { user: "Jordan Avery", email: "salamfoods.uz@gmail.com", action: "UPDATE", entity: "OTHER", summary: "Changed member role to MEMBER", ago: 4 },
    { user: "Mia Johnson", email: "mia@aywa.test", action: "STATUS_CHANGE", entity: "DEAL", summary: "Moved deal Q1 renewal — signed to WON", ago: 5 },
    { user: "Sam Patel", email: "sam@aywa.test", action: "STATUS_CHANGE", entity: "DEAL", summary: "Moved deal RFQ — lost to incumbent to LOST", ago: 6 },
    { user: "Alex Rivera", email: "alex@aywa.test", action: "SEND", entity: "ORDER", summary: "Emailed invoice SO-0009 to Northwind Traders", ago: 7 },
    { user: "Dana Whitfield", email: "dana@aywa.test", action: "OTHER", entity: "OTHER", summary: "Exported audit log to CSV", ago: 9 },
    { user: "Mia Johnson", email: "mia@aywa.test", action: "UPDATE", entity: "PRODUCT", summary: "Set reorder point on USB4 Docking Station to 25", ago: 12 },
    { user: "Sam Patel", email: "sam@aywa.test", action: "DELETE", entity: "PO", summary: "Cancelled purchase order PO-0011", ago: 17 },
    { user: "Alex Rivera", email: "alex@aywa.test", action: "CREATE", entity: "ORDER", summary: "Created sales order SO-0011 for Globex Corporation", ago: 22 },
    { user: "Jordan Avery", email: "salamfoods.uz@gmail.com", action: "UPDATE", entity: "VENDOR", summary: "Updated payment terms for Meridian Consulting Group to Net 45", ago: 27 },
  ];
  for (const a of AUDIT) {
    await db.auditLog.create({
      data: {
        workspaceId: WORKSPACE, userName: a.user, userEmail: a.email, action: a.action, entityType: a.entity,
        summary: a.summary, createdAt: rel(-a.ago),
      },
    });
  }

  // -----------------------------------------------------------------------
  // EMAIL EVENTS (comms ledger — opens / clicks / bounces / complaints)
  // -----------------------------------------------------------------------
  console.log("→ Seeding email events");
  const EMAILS: {
    resendId: string; entity: string; ref: string | null; recipient: string; subject: string; ago: number;
    opened?: number; openCount?: number; clicked?: number; clickCount?: number; bounced?: number; complained?: number;
  }[] = [
    { resendId: "re_evt_001_so0003", entity: "ORDER", ref: orderByNumber.get("SO-0003") ?? null, recipient: "marcus@globex.test", subject: "Your quote SO-0003 from Acme Corp", ago: 0, opened: 0, openCount: 3, clicked: 0, clickCount: 1 },
    { resendId: "re_evt_002_so0009", entity: "ORDER", ref: orderByNumber.get("SO-0009") ?? null, recipient: "sarah.chen@northwind.test", subject: "Invoice SO-0009 from Acme Corp", ago: 7, opened: 7, openCount: 2 },
    { resendId: "re_evt_003_so0004", entity: "ORDER", ref: orderByNumber.get("SO-0004") ?? null, recipient: "hannah@hooli.test", subject: "Your quote SO-0004 from Acme Corp", ago: 1, openCount: 0 },
    { resendId: "re_evt_004_deal", entity: "DEAL", ref: dealByName.get("Enterprise tier upgrade") ?? null, recipient: "tom@piedpiper.test", subject: "Proposal: Enterprise tier upgrade", ago: 2, opened: 2, openCount: 5, clicked: 2, clickCount: 2 },
    { resendId: "re_evt_005_bounce", entity: "DEAL", ref: dealByName.get("EU expansion add-on") ?? null, recipient: "old-address@globex.test", subject: "Following up on EU expansion", ago: 3, bounced: 3 },
    { resendId: "re_evt_006_complaint", entity: "OTHER", ref: null, recipient: "newsletter-optout@umbrella.test", subject: "Acme Corp product update — June", ago: 5, opened: 5, openCount: 1, complained: 5 },
    { resendId: "re_evt_007_po", entity: "PO", ref: null, recipient: "ap@cloudscale.test", subject: "RFQ PO-0003 from Acme Corp", ago: 2, opened: 2, openCount: 1, clicked: 2, clickCount: 1 },
  ];
  for (const e of EMAILS) {
    await db.emailEvent.create({
      data: {
        workspaceId: WORKSPACE, resendId: e.resendId, entityType: e.entity, entityId: e.ref ?? undefined,
        recipient: e.recipient, subject: e.subject, sentAt: rel(-e.ago),
        openedAt: e.opened !== undefined ? rel(-e.opened) : undefined, openCount: e.openCount ?? 0,
        clickedAt: e.clicked !== undefined ? rel(-e.clicked) : undefined, clickCount: e.clickCount ?? 0,
        bouncedAt: e.bounced !== undefined ? rel(-e.bounced) : undefined,
        complainedAt: e.complained !== undefined ? rel(-e.complained) : undefined,
      },
    });
  }

  // -----------------------------------------------------------------------
  // TAGS on deals
  // -----------------------------------------------------------------------
  console.log("→ Tagging deals");
  for (const d of dealsCreated) {
    const tags: string[] = [];
    const deal = DEALS.find((x) => x.name === d.name)!;
    if (deal.value >= 60000) tags.push("Enterprise");
    if (deal.value < 20000) tags.push("SMB");
    if (d.name.toLowerCase().includes("renewal")) tags.push("Renewal");
    if (d.name.toLowerCase().includes("upgrade") || d.name.toLowerCase().includes("expansion")) tags.push("Upsell");
    if (d.stage === "NEGOTIATION" || d.stage === "PROPOSAL") tags.push("Hot");
    for (const t of tags) await db.dealTag.create({ data: { dealId: d.id, tagId: tagByName.get(t)! } });
  }

  // -----------------------------------------------------------------------
  // Reconcile denormalized Product.stockOnHand with the movement ledger.
  // -----------------------------------------------------------------------
  console.log("→ Reconciling stock on-hand");
  const allProducts = await db.product.findMany({ where: { workspaceId: WORKSPACE }, select: { id: true } });
  for (const p of allProducts) {
    const agg = await db.stockMovement.aggregate({ where: { workspaceId: WORKSPACE, productId: p.id }, _sum: { quantity: true } });
    await db.product.update({ where: { id: p.id }, data: { stockOnHand: Math.round(agg._sum.quantity ?? 0) } });
  }

  // -----------------------------------------------------------------------
  // LOGISTICS FLEET (GPS tracking demo) — vehicles + a short recent track
  // around Tashkent so the live map looks populated out of the box.
  // -----------------------------------------------------------------------
  console.log("→ Seeding logistics fleet");
  const FLEET = [
    { name: "Truck #1", plate: "01 A 123 BC", type: "TRUCK", driver: "Bekzod Karimov", phone: "+998 90 111 22 33", start: [41.311, 69.279] as [number, number], status: "ACTIVE", speed: 47 },
    { name: "Van #2", plate: "01 B 456 DE", type: "VAN", driver: "Sardor Aliyev", phone: "+998 90 222 33 44", start: [41.327, 69.246] as [number, number], status: "ACTIVE", speed: 33 },
    { name: "Car #3", plate: "01 C 789 FG", type: "CAR", driver: "Jasur Tursunov", phone: "+998 90 333 44 55", start: [41.299, 69.301] as [number, number], status: "IDLE", speed: 0 },
    { name: "Bike #4", plate: "01 D 012 HI", type: "BIKE", driver: "Aziz Yusupov", phone: "+998 90 444 55 66", start: [41.338, 69.334] as [number, number], status: "MAINTENANCE", speed: 0 },
  ];
  for (const f of FLEET) {
    const v = await db.vehicle.create({
      data: {
        workspaceId: WORKSPACE,
        name: f.name,
        plate: f.plate,
        type: f.type,
        driverName: f.driver,
        phone: f.phone,
        status: f.status,
      },
    });
    const N = 20;
    let lat = f.start[0];
    let lng = f.start[1];
    const positions: { workspaceId: string; vehicleId: string; lat: number; lng: number; speed: number; recordedAt: Date }[] = [];
    let last = { lat, lng, speed: f.speed, recordedAt: new Date() };
    for (let i = N - 1; i >= 0; i--) {
      const recordedAt = new Date(Date.now() - i * 60_000);
      const moving = f.status === "ACTIVE";
      const speed = moving ? Math.max(0, Math.round(f.speed + Math.sin(i) * 8)) : 0;
      if (moving) {
        lat += 0.0009;
        lng += 0.0011;
      }
      positions.push({ workspaceId: WORKSPACE, vehicleId: v.id, lat, lng, speed, recordedAt });
      last = { lat, lng, speed, recordedAt };
    }
    await db.vehiclePosition.createMany({ data: positions });
    await db.vehicle.update({
      where: { id: v.id },
      data: { lastLat: last.lat, lastLng: last.lng, lastSpeed: last.speed, lastSeenAt: last.recordedAt },
    });
  }

  // -----------------------------------------------------------------------
  // Back-date updatedAt (raw SQL — bypasses @updatedAt) for time-bucketed
  // charts (revenue trend) and the stale-deal inbox signal.
  // -----------------------------------------------------------------------
  console.log("→ Back-dating updatedAt for trend charts");
  for (const f of updatedAtFixes) {
    if (f.table === "Deal") {
      await db.$executeRaw`UPDATE "Deal" SET "updatedAt" = ${f.ts} WHERE "id" = ${f.id}`;
    } else {
      await db.$executeRaw`UPDATE "SalesOrder" SET "updatedAt" = ${f.ts} WHERE "id" = ${f.id}`;
    }
  }

  console.log(
    `✓ Seeded workspace ${WORKSPACE}: ${CONTACTS.length} contacts, ${PRODUCTS.length + PHYSICAL.length} products, ` +
      `${DEALS.length + HISTORIC_DEALS.length + 2} deals, ${SALES.length + HISTORIC_ORDERS.length + 1} sales orders, ` +
      `${VENDORS.length} vendors, ${POS.length} purchase orders, ${SUBS.length} subscriptions, ` +
      `${EMPLOYEES.length} employees, ${TIME_OFF.length} time-off requests, ${PROJECTS.length} projects, ` +
      `${TASKS.length} tasks, ${USERS.length} members, ${INVITATIONS.length} invitations, ${AUDIT.length} audit logs, ` +
      `${EMAILS.length} email events.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
