/* eslint-disable @typescript-eslint/no-explicit-any */
// react-pdf primitives are not standard React DOM elements; they render to a
// PDF document, not the DOM. Disabling the JSX-only-DOM-elements check is
// scoped to this single template module.
import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type QuotePdfLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  productSku?: string | null;
};

export type QuotePdfData = {
  workspace: {
    name: string;
    slug: string;
    /** Absolute URL or absolute path to the workspace logo image. */
    logoUrl?: string | null;
    /** Brand accent in OKLCH/hex/rgb — used for the doc title color. */
    accentColor?: string | null;
  };
  order: {
    number: string;
    status: string;
    orderDate: Date;
    expectedDate: Date | null;
    currency: string;
    notes: string | null;
    ownerName: string | null;
  };
  customer: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  lines: QuotePdfLine[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    paddingBottom: 14,
    marginBottom: 22,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogo: {
    width: 38,
    height: 38,
    objectFit: "contain",
  },
  brandTextCol: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  brandSubtle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  docMeta: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  docNumber: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    fontSize: 9,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 24,
  },
  partyBox: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 8,
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 1,
  },
  datesRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 32,
    marginBottom: 22,
  },
  dateBlock: {},
  dateLabel: {
    fontSize: 8,
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  dateValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  cellDescription: { flex: 4 },
  cellQty: { flex: 1, textAlign: "right" },
  cellPrice: { flex: 1.4, textAlign: "right" },
  cellDisc: { flex: 1, textAlign: "right" },
  cellAmount: { flex: 1.6, textAlign: "right" },
  row: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    fontSize: 10,
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  productSku: { fontSize: 8, color: "#64748b", marginTop: 1 },
  totalsRow: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "flex-end",
  },
  totalsBox: {
    width: 220,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: "#475569" },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
  },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  notes: {
    marginTop: 28,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 14,
  },
  notesLabel: {
    fontSize: 8,
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 5,
    fontFamily: "Helvetica-Bold",
  },
  notesBody: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  pageNumber: {},
});

function fmtMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function lineAmount(line: QuotePdfLine) {
  const gross = line.quantity * line.unitPrice;
  const discountAmount = gross * (line.discount / 100);
  return gross - discountAmount;
}

const DOC_TITLE: Record<string, string> = {
  DRAFT: "Quote",
  SENT: "Quote",
  CONFIRMED: "Sales Order",
  DELIVERED: "Sales Order",
  INVOICED: "Invoice",
  CANCELLED: "Cancelled Order",
};

export function QuotePdfTemplate({ data }: { data: QuotePdfData }) {
  const subtotal = data.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0,
  );
  const totalDiscount = data.lines.reduce((sum, l) => {
    const gross = l.quantity * l.unitPrice;
    return sum + gross * (l.discount / 100);
  }, 0);
  const grandTotal = subtotal - totalDiscount;
  const docLabel = DOC_TITLE[data.order.status] ?? "Quote";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={[
            styles.header,
            data.workspace.accentColor
              ? { borderBottomColor: data.workspace.accentColor }
              : {},
          ]}
          fixed
        >
          <View style={styles.brand}>
            {data.workspace.logoUrl && (
              <PdfImage src={data.workspace.logoUrl} style={styles.brandLogo} />
            )}
            <View style={styles.brandTextCol}>
              <Text style={styles.brandName}>{data.workspace.name.toUpperCase()}</Text>
              <Text style={styles.brandSubtle}>{data.workspace.slug}.aywa.app</Text>
            </View>
          </View>
          <View style={styles.docMeta}>
            <Text
              style={[
                styles.docTitle,
                data.workspace.accentColor
                  ? { color: data.workspace.accentColor }
                  : {},
              ]}
            >
              {docLabel}
            </Text>
            <Text style={styles.docNumber}>#{data.order.number}</Text>
            <Text style={styles.statusBadge}>{data.order.status}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>FROM</Text>
            <Text style={styles.partyName}>{data.workspace.name}</Text>
            {data.order.ownerName && (
              <Text style={styles.partyLine}>{data.order.ownerName}</Text>
            )}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>BILL TO</Text>
            {data.customer ? (
              <>
                <Text style={styles.partyName}>
                  {data.customer.company ?? data.customer.name}
                </Text>
                {data.customer.company && (
                  <Text style={styles.partyLine}>{data.customer.name}</Text>
                )}
                {data.customer.email && (
                  <Text style={styles.partyLine}>{data.customer.email}</Text>
                )}
                {data.customer.phone && (
                  <Text style={styles.partyLine}>{data.customer.phone}</Text>
                )}
              </>
            ) : (
              <Text style={styles.partyLine}>—</Text>
            )}
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>ISSUE DATE</Text>
            <Text style={styles.dateValue}>{fmtDate(data.order.orderDate)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>
              {docLabel === "Invoice" ? "DUE DATE" : "EXPECTED"}
            </Text>
            <Text style={styles.dateValue}>{fmtDate(data.order.expectedDate)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.cellDescription}>DESCRIPTION</Text>
          <Text style={styles.cellQty}>QTY</Text>
          <Text style={styles.cellPrice}>UNIT PRICE</Text>
          <Text style={styles.cellDisc}>DISC.</Text>
          <Text style={styles.cellAmount}>AMOUNT</Text>
        </View>

        {data.lines.length === 0 ? (
          <View style={styles.row}>
            <Text style={{ ...styles.cellDescription, color: "#94a3b8" }}>
              No line items.
            </Text>
            <Text style={styles.cellQty}>—</Text>
            <Text style={styles.cellPrice}>—</Text>
            <Text style={styles.cellDisc}>—</Text>
            <Text style={styles.cellAmount}>—</Text>
          </View>
        ) : (
          data.lines.map((line, idx) => (
            <View
              key={idx}
              style={idx % 2 === 1 ? { ...styles.row, ...styles.rowAlt } : styles.row}
            >
              <View style={styles.cellDescription}>
                <Text>{line.description}</Text>
                {line.productSku && (
                  <Text style={styles.productSku}>SKU: {line.productSku}</Text>
                )}
              </View>
              <Text style={styles.cellQty}>{line.quantity}</Text>
              <Text style={styles.cellPrice}>
                {fmtMoney(line.unitPrice, data.order.currency)}
              </Text>
              <Text style={styles.cellDisc}>
                {line.discount > 0 ? `${line.discount}%` : "—"}
              </Text>
              <Text style={styles.cellAmount}>
                {fmtMoney(lineAmount(line), data.order.currency)}
              </Text>
            </View>
          ))
        )}

        <View style={styles.totalsRow}>
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {fmtMoney(subtotal, data.order.currency)}
              </Text>
            </View>
            {totalDiscount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  -{fmtMoney(totalDiscount, data.order.currency)}
                </Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>
                {fmtMoney(grandTotal, data.order.currency)}
              </Text>
            </View>
          </View>
        </View>

        {data.order.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesBody}>{data.order.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Generated by {data.workspace.name} · {fmtDate(new Date())}
          </Text>
          <Text
            style={styles.pageNumber}
            render={(({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} of ${totalPages}`) as any}
          />
        </View>
      </Page>
    </Document>
  );
}
