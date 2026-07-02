import { useMemo, useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAllOrders } from "../../orders/hooks/useOrders";
import { useAllTickets } from "../../support/hooks/useTickets";

export interface Customer {
  id: string; // usually userId, or email if no userId
  userId?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  dob?: string;
  registeredDate: Date | null;
  hasAccount: boolean; // true = registered profile; false = guest (order-only)
  lifetimeSpend: number;
  averageOrderValue: number;
  lastOrderDate: Date | null;
  preferredSeries: string;
  preferredSubSeries: string;
  orders: any[];
  tickets: any[];
  savedBuilds: any[];
}

export function useCustomers() {
  const { orders, loading: ordersLoading } = useAllOrders();
  const { tickets, loading: ticketsLoading } = useAllTickets();
  const [users, setUsers] = useState<any[]>([]);
  const [savedBuilds, setSavedBuilds] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: profs }, { data: blds }] = await Promise.all([
        supabase.from("profiles").select("*").limit(500),
        supabase.from("builds").select("*").limit(500),
      ]);
      if (!active) return;
      setUsers(
        (profs ?? []).map((r: any) => ({
          id: r.id,
          name: r.full_name,
          email: r.email,
          phone: r.phone,
          dob: r.dob,
          address: r.address?.line1 || "",
          city: r.address?.city || "",
          state: r.address?.state || "",
          createdAt: r.created_at,
        })),
      );
      setSavedBuilds((blds ?? []).map((r: any) => ({ id: r.id, ...(r.snapshot as any) })));
      setLoadingExtras(false);
    })();
    return () => { active = false; };
  }, []);

  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>();

    const getOrCreateCustomer = (
      id: string,
      initialData?: Partial<Customer>,
    ) => {
      if (!customerMap.has(id)) {
        customerMap.set(id, {
          id,
          userId: initialData?.userId || (id.includes("@") ? undefined : id),
          name: initialData?.name || "Unknown",
          email: initialData?.email || "",
          phone: initialData?.phone || "",
          address: initialData?.address || "",
          city: initialData?.city || "",
          state: initialData?.state || "",
          dob: initialData?.dob,
          registeredDate: initialData?.registeredDate || null,
          hasAccount: initialData?.hasAccount || false,
          lifetimeSpend: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          preferredSeries: "N/A",
          preferredSubSeries: "N/A",
          orders: [],
          tickets: [],
          savedBuilds: [],
        });
      }
      return customerMap.get(id)!;
    };

    // Process Users first
    for (const u of users) {
      const registeredDate = u.createdAt?.toDate
        ? u.createdAt.toDate()
        : u.createdAt
          ? new Date(u.createdAt)
          : null;
      getOrCreateCustomer(u.id, {
        userId: u.id,
        name: u.displayName || u.name || "Unknown",
        email: u.email,
        phone: u.phone,
        address: u.address,
        city: u.city,
        state: u.state,
        dob: u.dob,
        registeredDate,
        hasAccount: true,
      });
    }

    // Process Orders
    for (const order of orders) {
      const id =
        order.userId ||
        order.customer?.email ||
        order.shippingDetails?.email ||
        order.id;
      const customer = getOrCreateCustomer(id, {
        userId: order.userId,
        name: order.customer?.name || order.shippingDetails?.name || "Unknown",
        email: order.customer?.email || order.shippingDetails?.email,
        phone: order.customer?.phone || order.shippingDetails?.phone,
        address: order.shippingDetails?.address,
        city: order.shippingDetails?.city,
        state: order.shippingDetails?.state,
      });

      customer.orders.push(order);

      const isPaidAndNotCancelled =
        (order.payment?.status === "confirmed" ||
          order.paymentStatus === "confirmed") &&
        order.status !== "Cancelled";
      if (isPaidAndNotCancelled) {
        customer.lifetimeSpend += order.pricing?.total || order.totalPrice || 0;
      }

      const orderDate = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt || 0);
      if (!customer.lastOrderDate || orderDate > customer.lastOrderDate) {
        customer.lastOrderDate = orderDate;
      }

      if (customer.name === "Unknown" && order.customer?.name)
        customer.name = order.customer.name;
      if (!customer.email && order.customer?.email)
        customer.email = order.customer.email;
      if (!customer.phone && order.customer?.phone)
        customer.phone = order.customer.phone;
    }

    // Process Tickets
    for (const ticket of tickets) {
      const id = ticket.userId || ticket.customerEmail || ticket.id;
      const customer = getOrCreateCustomer(id, {
        userId: ticket.userId,
        name: ticket.customerName,
        email: ticket.customerEmail,
      });
      customer.tickets.push(ticket);
    }

    // Process Saved Builds
    for (const build of savedBuilds) {
      if (!build.userId) continue;
      const customer = getOrCreateCustomer(build.userId, {
        userId: build.userId,
      });
      customer.savedBuilds.push(build);
    }

    // Calculate AOV and preferences
    const result = Array.from(customerMap.values());
    for (const c of result) {
      const paidOrdersCount = c.orders.filter(
        (o) =>
          (o.payment?.status === "confirmed" ||
            o.paymentStatus === "confirmed") &&
          o.status !== "Cancelled",
      ).length;
      if (paidOrdersCount > 0) {
        c.averageOrderValue = c.lifetimeSpend / paidOrdersCount;
      }

      const seriesCount: Record<string, number> = {};
      const subSeriesCount: Record<string, number> = {};

      c.orders.forEach((o) => {
        (o.items || []).forEach((item: any) => {
          const name = item.product?.name || "Unknown";
          const series = name.split(" ")[0];
          seriesCount[series] =
            (seriesCount[series] || 0) + (item.quantity || 1);
          subSeriesCount[name] =
            (subSeriesCount[name] || 0) + (item.quantity || 1);
        });
      });

      if (Object.keys(seriesCount).length > 0) {
        c.preferredSeries = Object.entries(seriesCount).sort(
          (a, b) => b[1] - a[1],
        )[0][0];
      }
      if (Object.keys(subSeriesCount).length > 0) {
        c.preferredSubSeries = Object.entries(subSeriesCount).sort(
          (a, b) => b[1] - a[1],
        )[0][0];
      }

      c.orders.sort((a, b) => {
        const tA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      c.savedBuilds.sort((a, b) => {
        const tA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      c.tickets.sort((a, b) => {
        const tA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });
    }

    return result.sort((a, b) => {
      const tA = a.lastOrderDate ? a.lastOrderDate.getTime() : 0;
      const tB = b.lastOrderDate ? b.lastOrderDate.getTime() : 0;
      return tB - tA; // most recent order first
    });
  }, [orders, tickets, users, savedBuilds]);

  return {
    customers,
    loading: ordersLoading || ticketsLoading || loadingExtras,
  };
}
