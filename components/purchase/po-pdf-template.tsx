/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type PoPdfLine = {
  description: string;
  quantity: number;
  unitCost: number;
  productSku?: string | null;
};

export type PoPdfData = {
  workspace: {
    name: string;
    slug: string;
    logoUrl?: string | null;
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
  vendor: {
    name: string;
    email: string | null;
    phone: string | null;
    contactPerson: string | null;
    paymentTerms: string | null;
  } | null;
  lines: PoPdfLine[];
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: "#0f172a", paddingBottom: 14, marginBottom: 22 },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  brandSubtle: { fontSize: 9, color: "#64748b", marginTop: 2 },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  docNumber: { fontSize: 11, color: "#475569", marginTop: 2 },
  statusBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#e2e8f0", fontSize: 9, borderRadius: 3, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22, gap: 24 },
  partyBox: { flex: 1 },
  partyLabel: { fontSize: 8, color: "#64748b", letterSpacing: 1, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  partyLine: { fontSize: 9, color: "#475569", marginBottom: 1 },
  datesRow: { flexDirection: "row", gap: 32, marginBottom: 22 },
  dateBlock: {},
  dateLabel: { fontSize: 8, color: "#64748b", letterSpacing: 1, marginBottom: 3, fontFamily: "Helvetica-Bold" },
  dateValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#0f172a", color: "#ffffff", paddingHorizontal: 10, paddingVertical: 7, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  cellDescription: { flex: 5 },
  cellQty: { flex: 1, textAlign: "right" },
  cellPrice: { flex: 1.6, textAlign: "right" },
  cellAmount: { flex: 1.8, textAlign: "right" },
  row: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", fontSize: 10 },
  rowAlt: { backgroundColor: "#f8fafc" },
  productSku: { fontSize: 8, color: "#64748b", marginTop: 1 },
  totalsRow: { flexDirection: "row", marginTop: 16, justifyContent: "flex-end" },
  totalsBox: { width: 220 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: "#0f172a" },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 28, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 14 },
  notesLabel: { fontSize: 8, color: "#64748b", letterSpacing: 1, marginBottom: 5, fontFamily: "Helvetica-Bold" },
  notesBody: { fontSize: 10, lineHeight: 1.5, color: "#334155" },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#94a3b8", borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 8 },
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
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const DOC_TITLE: Record<string, string> = {
  DRAFT: "Draft Purchase Order",
  RFQ_SENT: "Request for Quotation",
  APPROVED: "Purchase Order",
  RECEIVED: "Purchase Order",
  BILLED: "Vendor Bill",
  CANCELLED: "Cancelled PO",
};

export function PoPdfTemplate({ data }: { data: PoPdfData }) {
  const total = data.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  const docLabel = DOC_TITLE[data.order.status] ?? "Purchase Order";

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {data.workspace.logoUrl && (
              <PdfImage
                src={data.workspace.logoUrl}
                style={{ width: 38, height: 38, objectFit: "contain" }}
              />
            )}
            <View>
              <Text style={styles.brandName}>{data.workspace.name.toUpperCase()}</Text>
              <Text style={styles.brandSubtle}>{data.workspace.slug}.aywa.app</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
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
            <Text style={styles.partyLabel}>BUYER</Text>
            <Text style={styles.partyName}>{data.workspace.name}</Text>
            {data.order.ownerName && <Text style={styles.partyLine}>{data.order.ownerName}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>VENDOR</Text>
            {data.vendor ? (
              <>
                <Text style={styles.partyName}>{data.vendor.name}</Text>
                {data.vendor.contactPerson && <Text style={styles.partyLine}>{data.vendor.contactPerson}</Text>}
                {data.vendor.email && <Text style={styles.partyLine}>{data.vendor.email}</Text>}
                {data.vendor.phone && <Text style={styles.partyLine}>{data.vendor.phone}</Text>}
                {data.vendor.paymentTerms && <Text style={styles.partyLine}>Terms: {data.vendor.paymentTerms}</Text>}
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
            <Text style={styles.dateLabel}>EXPECTED DELIVERY</Text>
            <Text style={styles.dateValue}>{fmtDate(data.order.expectedDate)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.cellDescription}>DESCRIPTION</Text>
          <Text style={styles.cellQty}>QTY</Text>
          <Text style={styles.cellPrice}>UNIT COST</Text>
          <Text style={styles.cellAmount}>AMOUNT</Text>
        </View>

        {data.lines.length === 0 ? (
          <View style={styles.row}>
            <Text style={{ ...styles.cellDescription, color: "#94a3b8" }}>No line items.</Text>
            <Text style={styles.cellQty}>—</Text>
            <Text style={styles.cellPrice}>—</Text>
            <Text style={styles.cellAmount}>—</Text>
          </View>
        ) : (
          data.lines.map((line, idx) => (
            <View key={idx} style={idx % 2 === 1 ? { ...styles.row, ...styles.rowAlt } : styles.row}>
              <View style={styles.cellDescription}>
                <Text>{line.description}</Text>
                {line.productSku && <Text style={styles.productSku}>SKU: {line.productSku}</Text>}
              </View>
              <Text style={styles.cellQty}>{line.quantity}</Text>
              <Text style={styles.cellPrice}>{fmtMoney(line.unitCost, data.order.currency)}</Text>
              <Text style={styles.cellAmount}>{fmtMoney(line.quantity * line.unitCost, data.order.currency)}</Text>
            </View>
          ))
        )}

        <View style={styles.totalsRow}>
          <View style={styles.totalsBox}>
            <View style={styles.grandTotal}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{fmtMoney(total, data.order.currency)}</Text>
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
          <Text>Generated by {data.workspace.name} · {fmtDate(new Date())}</Text>
          <Text
            render={(({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} of ${totalPages}`) as any}
          />
        </View>
      </Page>
    </Document>
  );
}
