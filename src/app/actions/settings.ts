"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function setHiddenColumnsAction(columns: string[]) {
  try {
    const user = await getSession();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const key = `hidden_columns_${user.userId}`;
    const value = JSON.stringify(columns);

    await prisma.setting.upsert({
      where: {
        key_organizationId: {
          key,
          organizationId: user.organizationId,
        },
      },
      update: {
        value,
      },
      create: {
        key,
        value,
        organizationId: user.organizationId,
      },
    });

    try {
      revalidatePath("/workspace/projects");
    } catch(e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Error setting hidden columns:", error);
    return { success: false, error: error.message };
  }
}

import { unstable_noStore as noStore } from "next/cache";

export async function getHiddenColumnsAction() {
  noStore();
  try {
    const user = await getSession();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized", columns: [] };
    }

    const key = `hidden_columns_${user.userId}`;
    
    const setting = await prisma.setting.findUnique({
      where: {
        key_organizationId: {
          key,
          organizationId: user.organizationId,
        },
      },
    });

    if (setting) {
      return { success: true, columns: JSON.parse(setting.value) as string[] };
    }

    return { success: true, columns: [] };
  } catch (error: any) {
    console.error("Error getting hidden columns:", error);
    return { success: false, error: error.message, columns: [] };
  }
}

export async function setTaskHiddenColumnsAction(columns: string[]) {
  try {
    const user = await getSession();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const key = `task_hidden_columns_${user.userId}`;
    const value = JSON.stringify(columns);

    await prisma.setting.upsert({
      where: {
        key_organizationId: {
          key,
          organizationId: user.organizationId,
        },
      },
      update: {
        value,
      },
      create: {
        key,
        value,
        organizationId: user.organizationId,
      },
    });

    try {
      revalidatePath("/workspace/tasks");
    } catch(e) {}

    return { success: true };
  } catch (error: any) {
    console.error("Error setting task hidden columns:", error);
    return { success: false, error: error.message };
  }
}

export async function getTaskHiddenColumnsAction() {
  noStore();
  try {
    const user = await getSession();
    if (!user || !user.organizationId) {
      return { success: false, error: "Unauthorized", columns: [] };
    }

    const key = `task_hidden_columns_${user.userId}`;
    
    const setting = await prisma.setting.findUnique({
      where: {
        key_organizationId: {
          key,
          organizationId: user.organizationId,
        },
      },
    });

    if (setting) {
      return { success: true, columns: JSON.parse(setting.value) as string[] };
    }

    return { success: true, columns: [] };
  } catch (error: any) {
    console.error("Error getting task hidden columns:", error);
    return { success: false, error: error.message, columns: [] };
  }
}

