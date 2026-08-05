import { prisma } from "../lib/prisma";

export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

export async function createTicket(params: {
  userId: string;
  subject: string;
  message: string;
  category?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  return prisma.supportTicket.create({
    data: {
      userId: params.userId,
      subject: params.subject,
      status: "OPEN",
      category: params.category ?? "GENERAL",
      priority: params.priority ?? "MEDIUM",
      messages: {
        create: [{ userId: params.userId, content: params.message, fromUser: true }],
      },
    },
    include: { messages: true },
  });
}

export async function getMyTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTicket(userId: string, ticketId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) {
    const err = new Error("Ticket not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return ticket;
}

/**
 * Add message to ticket. If user is admin/support, mark fromSupport.
 */
export async function addMessage(params: {
  ticketId: string;
  userId: string;
  content: string;
  fromSupport?: boolean;
}) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.ticketId, userId: params.userId },
  });
  if (!ticket && !params.fromSupport) {
    const err = new Error("Ticket not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  return prisma.chatMessage.create({
    data: {
      supportTicketId: params.ticketId,
      userId: params.userId,
      content: params.content,
      fromUser: !params.fromSupport,
    },
  });
}

export async function adminListTickets(params: { status?: string; page?: number; pageSize?: number }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const where = params.status ? { status: params.status as TicketStatus } : {};

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, tickets };
}

export async function updateTicketStatus(params: {
  ticketId: string;
  status: TicketStatus;
  adminId: string;
}) {
  await prisma.chatMessage.create({
    data: {
      supportTicketId: params.ticketId,
      userId: params.adminId,
      content: `Ticket status changed to ${params.status}`,
      fromUser: false,
    },
  });
  return prisma.supportTicket.update({
    where: { id: params.ticketId },
    data: { status: params.status },
  });
}
