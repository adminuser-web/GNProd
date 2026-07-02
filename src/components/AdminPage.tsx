import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { RevealSection } from "./Reveal";
import {
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  LifeBuoy,
  UserPlus,
  Bookmark,
  Layers,
  Tag,
  Share2,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import { mapLegacyStatus, STATUS_COLORS } from "../lib/orderStatus";
import { useAllOrders } from "../features/orders/hooks/useOrders";
import { useAllTickets } from "../features/support/hooks/useTickets";
import { useCustomers } from "../features/crm/hooks/useCustomers";
import { Skeleton } from "./Skeleton";
import { PageHeader, StatCard, Segmented } from "./admin/ui";

function useAllSavedBuilds() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("builds")
      .select("*")
      .limit(500)
      .then(({ data }) => {
        setBuilds((data ?? []).map((d: any) => ({ id: d.id, ...(d.snapshot as any) })));
        setLoading(false);
      });
  }, []);

  return { builds, loading };
}

const orderTotal = (o: any) =>
  o.pricing?.total ?? o.totalPrice ?? o.grandTotal ?? 0;
const orderDate = (o: any) =>
  o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// --- Charts ---

function BarChart({
  data,
  title,
  isCurrency = false,
}: {
  data: { label: string; value: number }[];
  title: string;
  isCurrency?: boolean;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-surface border border-[#c5a059]/20 p-4 flex flex-col h-full min-h-[210px]">
      <h3 className="text-[10px] text-muted uppercase tracking-widest mb-4">
        {title}
      </h3>
      <div className="flex-1 flex items-end gap-1 md:gap-2 justify-between mt-auto">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full group relative"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 text-[9px] bg-bg border border-[#c5a059]/30 px-2 py-1 whitespace-nowrap z-raised">
              {d.label}: {isCurrency ? inr(d.value) : d.value}
            </div>
            <div
              className="w-full max-w-[40px] bg-[#c5a059] opacity-70 group-hover:opacity-100 transition-all rounded-t-sm"
              style={{ height: `${Math.max((d.value / maxVal) * 100, 2)}%` }}
            />
            <div className="text-[9px] text-muted mt-2 uppercase tracking-wider truncate w-full text-center">
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[];
  title: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let cumulativeOffset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const defaultColors = [
    "#c5a059",
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  return (
    <div className="bg-surface border border-[#c5a059]/20 p-4 flex flex-col sm:flex-row items-center sm:items-start gap-6 h-full">
      <div className="flex-1 flex flex-col justify-center items-center relative">
        <h3 className="text-[10px] text-muted uppercase tracking-widest absolute top-0 left-0 w-full text-left">
          {title}
        </h3>
        <svg
          viewBox="0 0 100 100"
          className="w-[120px] h-[120px] transform -rotate-90 mt-7"
        >
          {data.length === 0 ? (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#333"
              strokeWidth="20"
            />
          ) : (
            data.map((d, i) => {
              const fraction = d.value / total;
              const dashLength = fraction * circumference;
              const strokeDasharray = `${dashLength} ${circumference}`;
              const strokeDashoffset = -cumulativeOffset;
              cumulativeOffset += dashLength;
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={d.color || defaultColors[i % defaultColors.length]}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })
          )}
        </svg>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1.5 mt-3 sm:mt-7 w-full">
        {data.length === 0 && <div className="text-xs text-muted">No data</div>}
        {data.map((d, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    d.color || defaultColors[i % defaultColors.length],
                }}
              />
              <span className="text-content truncate">{d.label}</span>
            </div>
            <span className="font-bold shrink-0 ml-2">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (d.value / maxVal) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-surface border border-[#c5a059]/20 p-4 flex flex-col h-full min-h-[210px]">
      <h3 className="text-[10px] text-muted uppercase tracking-widest mb-4">
        {title}
      </h3>
      <div className="flex-1 relative mt-4">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-[120px] overflow-visible"
        >
          {data.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="#c5a059"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {data.map((d, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * 100;
            const y = 100 - (d.value / maxVal) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="#1a1a1a"
                stroke="#c5a059"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div className="flex justify-between mt-4">
          {data.map((d, i) => (
            <div
              key={i}
              className="text-[9px] text-muted uppercase tracking-wider"
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionQueue({
  crafting,
  readyToShip,
  openSupport,
}: {
  crafting: number;
  readyToShip: number;
  openSupport: number;
}) {
  const items = [
    {
      label: "Paid orders in crafting",
      count: crafting,
      icon: ShoppingBag,
      to: "/admin/orders?status=Processing",
    },
    {
      label: "Ready to ship",
      count: readyToShip,
      icon: IndianRupee,
      to: "/admin/orders?status=Ready for Shipment",
    },
    {
      label: "Open support requests",
      count: openSupport,
      icon: LifeBuoy,
      to: "/admin/support?status=open",
    },
  ].filter((i) => i.count > 0);

  return (
    <div className="bg-surface border border-[#c5a059]/20 shadow-sm">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-content tracking-wide">All caught up — no orders or requests waiting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#c5a059]/10">
          {items.map((i) => (
            <Link
              key={i.label}
              to={i.to}
              className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#c5a059]/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full border border-[#c5a059]/30 flex items-center justify-center shrink-0">
                  <i.icon className="w-4 h-4 text-[#c5a059]" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-content leading-none">{i.count}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted mt-1 truncate">{i.label}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-[#c5a059] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPage() {
  const { orders, loading: oLoading } = useAllOrders();
  const { tickets, loading: tLoading } = useAllTickets();
  const { customers, loading: cLoading } = useCustomers();
  const { builds: savedBuilds, loading: bLoading } = useAllSavedBuilds();

  const [period, setPeriod] = useState<"30d" | "90d" | "12m">("30d");

  useEffect(() => {
    document.title = "Performance Dashboard — Admin";
  }, []);

  const loading = oLoading || tLoading || cLoading || bLoading;

  const m = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === "30d") cutoff.setDate(now.getDate() - 30);
    else if (period === "90d") cutoff.setDate(now.getDate() - 90);
    else if (period === "12m") cutoff.setFullYear(now.getFullYear() - 1);

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Cards
    const todaysOrders = orders.filter((o) => orderDate(o) >= todayStart);

    // Revenue counts only confirmed + not cancelled
    const paidValidOrders = orders.filter(
      (o) =>
        (o.payment?.status === "confirmed" ||
          o.paymentStatus === "confirmed") &&
        o.status !== "Cancelled",
    );
    const thisMonthSales = paidValidOrders
      .filter((o) => orderDate(o) >= monthStart)
      .reduce((sum, o) => sum + orderTotal(o), 0);

    const pendingOrders = orders.filter((o) => {
      const isPending =
        (o.payment?.status as string) === "pending" ||
        (o.payment?.status as string) === "submitted" ||
        (!o.payment &&
          ["Order Placed", "Payment Pending", "Payment Submitted"].includes(
            mapLegacyStatus(o.status || "Order Placed"),
          ));
      return isPending && o.status !== "Cancelled";
    });
    const pendingPaymentsAmt = pendingOrders.reduce(
      (sum, o) => sum + orderTotal(o),
      0,
    );

    const openSupportRequests = tickets.filter((t) =>
      ["open", "under_review"].includes(t.status || "open"),
    );

    // Action queue: things the owner should act on today (not period-bound).
    const craftingOrders = orders.filter(
      (o) => mapLegacyStatus(o.status || "") === "Processing",
    );
    const readyToShipOrders = orders.filter(
      (o) => mapLegacyStatus(o.status || "") === "Ready for Shipment",
    );

    const newCustomersCount = customers.filter((c) => {
      if (!c.orders.length) return false;
      const firstOrderDate = new Date(
        Math.min(...c.orders.map((o) => orderDate(o).getTime())),
      );
      return firstOrderDate >= cutoff;
    }).length;

    const savedBuildsPeriod = savedBuilds.filter((b) => {
      const d = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || 0);
      return d >= cutoff;
    });

    // Top Selling Series & Sub-series
    const seriesSales: Record<string, number> = {};
    const subSeriesSales: Record<string, number> = {};

    paidValidOrders
      .filter((o) => orderDate(o) >= cutoff)
      .forEach((o) => {
        (o.items || []).forEach((item: any) => {
          const qty = item.quantity || 1;
          const rev = (item.price || 0) * qty;
          const name = item.product?.name || "Unknown";

          // Heuristic: First word is series
          const series = name.split(" ")[0];
          seriesSales[series] = (seriesSales[series] || 0) + rev;
          subSeriesSales[name] = (subSeriesSales[name] || 0) + rev;
        });
      });

    const topSeries = Object.entries(seriesSales).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const topSubSeries = Object.entries(subSeriesSales).sort(
      (a, b) => b[1] - a[1],
    )[0];

    // Most Shared/Saved Product
    const buildProductCounts: Record<string, number> = {};
    savedBuildsPeriod.forEach((b) => {
      const n = b.productName || "Unknown";
      buildProductCounts[n] = (buildProductCounts[n] || 0) + 1;
    });
    const mostSavedProduct = Object.entries(buildProductCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];

    // Conversion: Computable if we assume order's item match saved builds roughly,
    // or just say "Not directly computable" for now without explicit ID link.
    // Let's omit if not computable accurately without IDs, but we can put a placeholder metric.

    // Charts Data

    // 1. Sales by month (Line Chart)
    const salesByMonthData = [];
    const numBuckets = period === "12m" ? 12 : 6;
    const bucketDur = (now.getTime() - cutoff.getTime()) / numBuckets;
    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(cutoff.getTime() + i * bucketDur);
      const bEnd = new Date(bStart.getTime() + bucketDur);
      const rev = paidValidOrders
        .filter((o) => {
          const t = orderDate(o).getTime();
          return t >= bStart.getTime() && t < bEnd.getTime();
        })
        .reduce((sum, o) => sum + orderTotal(o), 0);

      salesByMonthData.push({
        label:
          period === "12m"
            ? bStart.toLocaleDateString("en-US", { month: "short" })
            : bStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
        value: rev,
      });
    }

    // 2. Orders by Status (Donut)
    const statusCounts: Record<string, number> = {};
    orders
      .filter((o) => orderDate(o) >= cutoff)
      .forEach((o) => {
        const s = mapLegacyStatus(o.status || "Order Placed");
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
    const ordersByStatusData = Object.entries(statusCounts)
      .map(([label, value]) => ({
        label,
        value,
        color: STATUS_COLORS[label] || "#c5a059",
      }))
      .sort((a, b) => b.value - a.value);

    // 3. Support requests by type (Donut)
    const ticketCounts: Record<string, number> = {};
    tickets
      .filter(
        (t) =>
          (t.createdAt?.toDate
            ? t.createdAt.toDate()
            : new Date(t.createdAt || 0)) >= cutoff,
      )
      .forEach((t) => {
        const type = t.type ? t.type.replace(/_/g, " ") : "general";
        ticketCounts[type] = (ticketCounts[type] || 0) + 1;
      });
    const supportByTypeData = Object.entries(ticketCounts).map(
      ([label, value]) => ({ label, value }),
    );

    // 4. Customer Growth (Line)
    const custGrowthData = [];
    let runningCustCount = customers.filter((c) => {
      if (!c.orders.length) return false;
      return (
        new Date(Math.min(...c.orders.map((o) => orderDate(o).getTime()))) <
        cutoff
      );
    }).length;

    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(cutoff.getTime() + i * bucketDur);
      const bEnd = new Date(bStart.getTime() + bucketDur);
      const newInBucket = customers.filter((c) => {
        if (!c.orders.length) return false;
        const fd = new Date(
          Math.min(...c.orders.map((o) => orderDate(o).getTime())),
        );
        return fd >= bStart && fd < bEnd;
      }).length;
      runningCustCount += newInBucket;
      custGrowthData.push({
        label:
          period === "12m"
            ? bStart.toLocaleDateString("en-US", { month: "short" })
            : bStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
        value: runningCustCount,
      });
    }

    // 5. Sales by Series / SubSeries (Bar Chart max 5)
    const salesBySeriesData = Object.entries(seriesSales)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const salesBySubData = Object.entries(subSeriesSales)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Tables Data
    const recentOrders = orders
      .slice()
      .sort((a, b) => orderDate(b).getTime() - orderDate(a).getTime())
      .slice(0, 5);
    const recentTickets = tickets
      .slice()
      .sort((a, b) => {
        const tA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      })
      .slice(0, 5);
    const topCustomers = customers
      .slice()
      .sort((a, b) => b.averageOrderValue - a.averageOrderValue)
      .slice(0, 5);

    return {
      todaysOrders: todaysOrders.length,
      thisMonthSales,
      pendingPaymentsAmt,
      craftingOrders: craftingOrders.length,
      readyToShipOrders: readyToShipOrders.length,
      openSupportRequests: openSupportRequests.length,
      newCustomersCount,
      savedBuildsCount: savedBuildsPeriod.length,
      topSeries,
      topSubSeries,
      mostSavedProduct,

      salesByMonthData,
      ordersByStatusData,
      supportByTypeData,
      custGrowthData,
      salesBySeriesData,
      salesBySubData,

      recentOrders,
      recentTickets,
      topCustomers,
      popularBuilds: Object.entries(buildProductCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [orders, tickets, customers, savedBuilds, period]);

  if (loading) {
    return (
      <div className="pb-10 space-y-4 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-[#c5a059]/10 pb-6">
          <div>
            <Skeleton variant="text" className="h-3 w-32 mb-2" />
            <Skeleton variant="text" className="h-8 w-64" />
          </div>
          <Skeleton variant="rectangular" className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
             <Skeleton key={i} variant="rectangular" className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
             <Skeleton key={i} variant="rectangular" className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton variant="rectangular" className="h-64" />
          <Skeleton variant="rectangular" className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-4 font-sans">
      <RevealSection>
        <PageHeader
          eyebrow="Metrics & Reports"
          title="Performance Dashboard"
          actions={
            <Segmented<"30d" | "90d" | "12m">
              value={period}
              onChange={setPeriod}
              options={[
                { value: "30d", label: "30 Days" },
                { value: "90d", label: "90 Days" },
                { value: "12m", label: "1 Year" },
              ]}
            />
          }
        />
      </RevealSection>

      <RevealSection delay={25}>
        <ActionQueue
          crafting={m.craftingOrders}
          readyToShip={m.readyToShipOrders}
          openSupport={m.openSupportRequests}
        />
      </RevealSection>

      <RevealSection delay={50}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            to="/admin/orders"
            label="Today's Orders"
            value={m.todaysOrders}
            subLabel="Orders placed today"
            icon={ShoppingBag}
          />
          <StatCard
            to="/admin/orders"
            label="Confirmed Sales"
            value={inr(m.thisMonthSales)}
            subLabel="This month's revenue"
            icon={IndianRupee}
          />
          <StatCard
            to="/admin/orders?payment=pending"
            label="Pending Payments"
            value={inr(m.pendingPaymentsAmt)}
            subLabel="Awaiting action"
            icon={AlertTriangle}
            alert={m.pendingPaymentsAmt > 0}
          />
          <StatCard
            to="/admin/support?status=open"
            label="Open Support"
            value={m.openSupportRequests}
            subLabel="Requires attention"
            icon={LifeBuoy}
            alert={m.openSupportRequests > 0}
          />
          <StatCard
            to="/admin/customers"
            label="New Customers"
            value={m.newCustomersCount}
            subLabel={`In last ${period}`}
            icon={UserPlus}
          />
        </div>
      </RevealSection>

      <RevealSection delay={100}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Saved Builds"
            value={m.savedBuildsCount}
            subLabel={`In last ${period}`}
            icon={Bookmark}
          />
          <StatCard
            label="Top Series"
            value={m.topSeries ? m.topSeries[0] : "N/A"}
            subLabel={
              m.topSeries
                ? `₹${(m.topSeries[1] / 1000).toFixed(1)}k revenue`
                : "No data"
            }
            icon={Layers}
          />
          <StatCard
            label="Top Sub-Series"
            value={m.topSubSeries ? m.topSubSeries[0] : "N/A"}
            subLabel={
              m.topSubSeries
                ? `₹${(m.topSubSeries[1] / 1000).toFixed(1)}k revenue`
                : "No data"
            }
            icon={Tag}
          />
          <StatCard
            label="Most Saved Product"
            value={m.mostSavedProduct ? m.mostSavedProduct[0] : "N/A"}
            subLabel={
              m.mostSavedProduct ? `${m.mostSavedProduct[1]} saves` : "No saves"
            }
            icon={Share2}
          />
        </div>
      </RevealSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevealSection delay={150}>
          <LineChart title="Sales by Month" data={m.salesByMonthData} />
        </RevealSection>
        <RevealSection delay={150}>
          <DonutChart title="Orders by Status" data={m.ordersByStatusData} />
        </RevealSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevealSection delay={200}>
          <BarChart
            title="Sales by Series"
            data={m.salesBySeriesData}
            isCurrency
          />
        </RevealSection>
        <RevealSection delay={200}>
          <BarChart
            title="Sales by Sub-Series"
            data={m.salesBySubData}
            isCurrency
          />
        </RevealSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevealSection delay={250}>
          <DonutChart
            title="Support Requests by Type"
            data={m.supportByTypeData}
          />
        </RevealSection>
        <RevealSection delay={250}>
          <LineChart title="Customer Growth" data={m.custGrowthData} />
        </RevealSection>
      </div>

      {/* Tables */}
      <RevealSection delay={300}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Orders Table */}
          <div className="bg-surface border border-[#c5a059]/20 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#c5a059]/10 flex justify-between items-center bg-bg">
              <h3 className="text-[10px] uppercase tracking-widest text-muted">
                Recent Orders
              </h3>
              <Link
                to="/admin/orders"
                className="text-[9px] uppercase tracking-widest text-[#c5a059] hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-[#c5a059]/10">
              {m.recentOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  No recent orders
                </div>
              ) : (
                m.recentOrders.map((o, i) => (
                  <Link
                    key={i}
                    to={`/admin/orders/${o.id}`}
                    className="px-4 py-2.5 flex justify-between items-center hover:bg-[#c5a059]/5 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="text-sm font-bold text-content font-mono group-hover:text-[#c5a059] transition-colors">
                        {o.id.substring(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-muted mt-1">
                        {orderDate(o).toLocaleDateString()} &bull;{" "}
                        {o.customer?.name || o.shippingDetails?.name || "-"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-content">
                        {inr(orderTotal(o))}
                      </div>
                      <div
                        className="text-[9px] uppercase tracking-widest mt-1"
                        style={{
                          color:
                            STATUS_COLORS[
                              mapLegacyStatus(o.status || "Order Placed")
                            ],
                        }}
                      >
                        {mapLegacyStatus(o.status || "Order Placed")}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Support Requests Table */}
          <div className="bg-surface border border-[#c5a059]/20 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#c5a059]/10 flex justify-between items-center bg-bg">
              <h3 className="text-[10px] uppercase tracking-widest text-muted">
                Recent Support Requests
              </h3>
              <Link
                to="/admin/support"
                className="text-[9px] uppercase tracking-widest text-[#c5a059] hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-[#c5a059]/10">
              {m.recentTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  No recent requests
                </div>
              ) : (
                m.recentTickets.map((t, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex justify-between items-center hover:bg-[#c5a059]/5 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-content line-clamp-1">
                        {t.subject}
                      </div>
                      <div className="text-[10px] text-muted mt-1 uppercase tracking-widest">
                        {t.type ? t.type.replace(/_/g, " ") : "General"}
                      </div>
                    </div>
                    <div
                      className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm border shrink-0 ml-4"
                      style={{
                        borderColor:
                          t.status === "open" ? "#3b82f640" : "#10b98140",
                        color: t.status === "open" ? "#3b82f6" : "#10b981",
                        backgroundColor:
                          t.status === "open" ? "#3b82f610" : "#10b98110",
                      }}
                    >
                      {t.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Customers Table */}
          <div className="bg-surface border border-[#c5a059]/20 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#c5a059]/10 flex justify-between items-center bg-bg">
              <h3 className="text-[10px] uppercase tracking-widest text-muted">
                Top Customers by AOV
              </h3>
              <Link
                to="/admin/customers"
                className="text-[9px] uppercase tracking-widest text-[#c5a059] hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-[#c5a059]/10">
              {m.topCustomers.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  No customer data
                </div>
              ) : (
                m.topCustomers.map((c, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-[#c5a059]/5 transition-colors gap-2"
                  >
                    <div>
                      <div className="text-sm font-bold text-content">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-muted mt-1">
                        {c.email}
                      </div>
                    </div>
                    <div className="flex gap-4 sm:flex-col sm:gap-1 text-left sm:text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted">
                        AOV{" "}
                        <span className="font-bold text-content ml-1">
                          {inr(c.averageOrderValue)}
                        </span>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-muted">
                        LTV{" "}
                        <span className="font-bold text-content ml-1">
                          {inr(c.lifetimeSpend)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Popular Builds/Products Table */}
          <div className="bg-surface border border-[#c5a059]/20 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#c5a059]/10 flex justify-between items-center bg-bg">
              <h3 className="text-[10px] uppercase tracking-widest text-muted">
                Popular Saved Builds
              </h3>
            </div>
            <div className="divide-y divide-[#c5a059]/10">
              {m.popularBuilds.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  No saved builds
                </div>
              ) : (
                m.popularBuilds.map((pb, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex justify-between items-center hover:bg-[#c5a059]/5 transition-colors"
                  >
                    <div className="text-sm font-bold text-content">
                      {pb[0]}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 px-2 py-1 rounded-sm">
                      {pb[1]} Saves
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </RevealSection>

    </div>
  );
}
