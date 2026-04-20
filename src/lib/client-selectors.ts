import { Client, ClientStatus } from "@/types/client";

export function getDateKeyInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getClientById(clients: Client[], id: string) {
  return clients.find((client) => client.id === id);
}

export function filterClients(
  clients: Client[],
  query: string,
  status: "all" | ClientStatus
) {
  const normalized = query.trim().toLowerCase();

  return clients.filter((client) => {
    const matchesStatus = status === "all" || client.status === status;

    const matchesSearch =
      normalized.length === 0 ||
      client.companyName.toLowerCase().includes(normalized) ||
      client.name.toLowerCase().includes(normalized) ||
      client.city.toLowerCase().includes(normalized) ||
      client.segment.toLowerCase().includes(normalized) ||
      client.assignedTo.toLowerCase().includes(normalized) ||
      client.product.toLowerCase().includes(normalized);

    return matchesStatus && matchesSearch;
  });
}

export function getDashboardMetrics(clients: Client[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );

  const dueToday = clients.filter((client) => {
    const date = new Date(client.followUpDate);
    return date >= startOfToday && date <= endOfToday;
  }).length;

  const overdue = clients.filter(
    (client) =>
      new Date(client.followUpDate) < startOfToday &&
      client.status !== "won" &&
      client.status !== "lost"
  ).length;

  const pipelineValue = clients
    .filter((client) => client.status !== "lost")
    .reduce((sum, client) => sum + client.estimatedMonthlyValue, 0);

  const won = clients.filter((client) => client.status === "won").length;
  const negotiating = clients.filter(
    (client) => client.status === "interested" || client.status === "negotiating"
  ).length;
  const lost = clients.filter((client) => client.status === "lost").length;

  return {
    total: clients.length,
    dueToday,
    overdue,
    negotiating,
    won,
    lost,
    pipelineValue,
  };
}

export function getUpcomingFollowUps(clients: Client[], limit = 6) {
  return [...clients]
    .filter((client) => client.status !== "won" && client.status !== "lost")
    .sort(
      (a, b) =>
        new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
    )
    .slice(0, limit);
}

export function getFollowUpBuckets(clients: Client[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );

  const activeClients = clients.filter(
    (client) => client.status !== "won" && client.status !== "lost"
  );

  const overdue = activeClients
    .filter((client) => new Date(client.followUpDate) < startOfToday)
    .sort(
      (a, b) =>
        new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
    );

  const dueToday = activeClients
    .filter((client) => {
      const date = new Date(client.followUpDate);
      return date >= startOfToday && date <= endOfToday;
    })
    .sort(
      (a, b) =>
        new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
    );

  const upcoming = activeClients
    .filter((client) => new Date(client.followUpDate) > endOfToday)
    .sort(
      (a, b) =>
        new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
    );

  return { overdue, dueToday, upcoming };
}

export function getFollowUpBucketsInTimezone(
  clients: Client[],
  timeZone: string
) {
  const todayKey = getDateKeyInTimezone(new Date(), timeZone);
  const activeClients = clients.filter(
    (client) => client.status !== "won" && client.status !== "lost"
  );

  const withFollowUpMeta = activeClients
    .map((client) => ({
      client,
      followUpDateKey: getDateKeyInTimezone(new Date(client.followUpDate), timeZone),
      followUpDateTs: new Date(client.followUpDate).getTime(),
    }))
    .sort((a, b) => a.followUpDateTs - b.followUpDateTs);

  const overdue = withFollowUpMeta
    .filter((item) => item.followUpDateKey < todayKey)
    .map((item) => item.client);

  const dueToday = withFollowUpMeta
    .filter((item) => item.followUpDateKey === todayKey)
    .map((item) => item.client);

  const upcoming = withFollowUpMeta
    .filter((item) => item.followUpDateKey > todayKey)
    .map((item) => item.client);

  return { overdue, dueToday, upcoming };
}
