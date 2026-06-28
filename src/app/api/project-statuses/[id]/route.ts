import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Verify it belongs to org
    const status = await prisma.projectStatus.findUnique({
      where: { id }
    });

    if (!status || status.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Status not found or unauthorized" }, { status: 404 });
    }

    await prisma.projectStatus.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE project-status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.projectStatus.findUnique({
      where: { id }
    });

    if (!existing || existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Status not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.projectStatus.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        color: body.color !== undefined ? body.color : existing.color,
        order: body.order !== undefined ? body.order : existing.order,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH project-status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
