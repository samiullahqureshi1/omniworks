import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Verify user belongs to org
    const orgUser = await prisma.user.findFirst({
      where: {
        id: user.id,
        organizationId: orgId
      }
    });

    if (!orgUser) {
      return NextResponse.json({ error: "Unauthorized for this organization" }, { status: 403 });
    }

    const statuses = await prisma.projectStatus.findMany({
      where: { organizationId: orgId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(statuses);
  } catch (error: any) {
    console.error("GET project-statuses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: "Unauthorized. Only owners can create statuses." }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, organizationId, order } = body;

    if (!name || !organizationId) {
      return NextResponse.json({ error: "Name and Organization ID are required" }, { status: 400 });
    }

    const status = await prisma.projectStatus.create({
      data: {
        name,
        color: color || "#cccccc",
        organizationId,
        order: order || 0,
        createdByOwner: true,
      },
    });

    return NextResponse.json(status);
  } catch (error: any) {
    console.error("POST project-statuses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
